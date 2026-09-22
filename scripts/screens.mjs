#!/usr/bin/env node
/**
 * Песочница экранов — сборка мини-аппов сразу в формате нашего билдера.
 *
 *   node scripts/screens.mjs new <имя>
 *   node scripts/screens.mjs check <имя>
 *   node scripts/screens.mjs preview <имя>
 *   node scripts/screens.mjs push <имя>
 *
 * Отличие от lab.mjs: там Next-проект, который надо собирать и поднимать
 * сервером. Здесь экран — обычный HTML по спеке импорта (docs/SPEC.md).
 * Поэтому нет сборки (нечему падать с spawn EPERM), превью открывается
 * файлом, а перенос в кабинет — это одна отправка на платформу.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LAB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [, , cmd, name] = process.argv;

const die = (msg) => { console.error(msg); process.exit(1); };
const appDir = (n) => join(LAB, "projects", n);
const screensDir = (n) => join(appDir(n), "screens");

/** Файлы экранов по порядку имён: 01-, 02-, 03- задают порядок в кабинете. */
function screenFiles(n) {
  const dir = screensDir(n);
  if (!existsSync(dir)) die(`Нет папки screens у «${n}». Это проект старого формата? Тогда scripts/lab.mjs`);
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".html")).sort();
  if (!files.length) die(`В «${n}» нет ни одного .html в screens/`);
  return files.map((f) => ({ file: f, path: join(dir, f) }));
}

function cmdNew() {
  if (!name) die("Укажите имя: node scripts/screens.mjs new my-app");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    die(`Имя только из строчных латинских букв, цифр и дефисов: «${name}» не подходит`);
  }
  const dst = appDir(name);
  if (existsSync(dst)) die(`Проект «${name}» уже есть: ${dst}`);

  mkdirSync(join(LAB, "projects"), { recursive: true });
  cpSync(join(LAB, "template-screens"), dst, { recursive: true });

  const metaPath = join(dst, "meta.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  meta.name = name;
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(`Готово: projects/${name}`);
  console.log(`  экраны:  projects/${name}/screens/*.html`);
  console.log(`  адресат: projects/${name}/meta.json (projectId из кабинета)`);
  console.log(`\nДальше: node scripts/screens.mjs check ${name}`);
}

/** Адрес платформы и ключ. Ключ только из окружения — в репозиторий не кладём. */
const API = (process.env.MINIAPP_URL || "https://miniapp.alterda.ru").replace(/\/+$/, "");
const TOKEN = process.env.MINIAPP_ADMIN_TOKEN || "";

/**
 * Быстрые правила спеки, которые видно без парсера. Они ловят самое частое:
 * агент по привычке пишет классы Tailwind или размеры в rem, и экран
 * приезжает в кабинет голым.
 */
function lint(raw, file) {
  const problems = [];
  const add = (m) => problems.push(`${file}: ${m}`);
  // Комментарии вырезаем: в них объясняются правила, и упомянутый там тег
  // не должен считаться разметкой. Парсер платформы их тоже игнорирует.
  const html = raw.replace(/<!--[\s\S]*?-->/g, "");

  if (!/<section[\s>]/i.test(html)) add("нет корневого <section> — экран не распознается");
  if (/\sclass=/i.test(html)) add("есть class= — стили только inline через style=");
  if (/<(script|style|link|head)[\s>]/i.test(html)) add("есть script/style/link/head — запрещены");
  if (/style="[^"]*\d(rem|em|%)/i.test(html)) add("размеры в rem/em/% — только px");
  if (/```/.test(html)) add("markdown-обёртка ``` внутри файла");

  // Ширина корня: 375 — единственная, под которую считается раскладка.
  const root = html.match(/<section[^>]*style="([^"]*)"/i);
  if (root && !/width\s*:\s*375/.test(root[1])) add("у корневого section ширина не 375");

  const sections = (html.match(/<section[\s>]/gi) || []).length;
  if (sections > 1) add(`${sections} корневых <section> в одном файле — по одному экрану на файл`);

  return problems;
}

async function apiPost(path, body) {
  if (!TOKEN) die("Нет MINIAPP_ADMIN_TOKEN — ключ доступа к платформе.\n  Задайте его в окружении и повторите.");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Все экраны проекта одним HTML: парсер платформы читает section подряд. */
function joinScreens(n) {
  return screenFiles(n).map(({ path }) => readFileSync(path, "utf8")).join("\n");
}

async function cmdCheck() {
  if (!name) die("Укажите имя: node scripts/screens.mjs check my-app");
  const files = screenFiles(name);

  let problems = [];
  for (const { file, path } of files) problems = problems.concat(lint(readFileSync(path, "utf8"), file));
  if (problems.length) {
    console.error("КРАСНО: разметка не по спеке\n");
    for (const p of problems) console.error("  · " + p);
    console.error("\nСпека: docs/SPEC.md");
    process.exit(1);
  }
  console.log(`правила спеки: ок (${files.length} экранов)`);

  // Вторая проверка — настоящим парсером платформы, без записи. Локальные
  // правила видят не всё: вложенность, неизвестный data-craft и прочее
  // вылезает только при разборе.
  const r = await apiPost("/api/screens/import-html", { html: joinScreens(name), dry: true });
  if (!r.ok) {
    console.error(`\nКРАСНО: платформа отклонила (${r.status}): ${r.data?.error || "неизвестно"}`);
    process.exit(1);
  }
  console.log("\nЗЕЛЕНО: экраны импортируются\n");
  for (const s of r.data.screens) {
    console.log(`  ${String(s.index + 1).padStart(2)}. ${s.name} — ${s.nodes} элементов` +
      (s.aiAssets ? `, картинок в генерацию: ${s.aiAssets}` : ""));
  }
  console.log(`\nДальше: node scripts/screens.mjs push ${name}`);
}

const commands = { new: cmdNew, check: cmdCheck };
const fn = commands[cmd];
if (!fn) {
  console.log(`Команды:
  node scripts/screens.mjs new <имя>       создать из шаблона
  node scripts/screens.mjs check <имя>     проверить экраны
  node scripts/screens.mjs preview <имя>   посмотреть в браузере
  node scripts/screens.mjs push <имя>      отправить в билдер`);
  process.exit(cmd ? 1 : 0);
}
await fn();
