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

/**
 * projectId платформа читает из куки alter_active_project, а не из тела
 * запроса: тот же механизм, что и у кабинета при переключении проекта.
 * Поэтому адресуем экраны именно так, иначе они лягут в первый попавшийся.
 */
async function apiPost(path, body, projectId) {
  if (!TOKEN) die("Нет MINIAPP_ADMIN_TOKEN — ключ доступа к платформе.\n  Задайте его в окружении и повторите.");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(projectId ? { Cookie: `alter_active_project=${projectId}` } : {}),
    },
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

/**
 * Превью: один файл, где экраны стоят рядом в рамке 375.
 *
 * Сервера здесь нет намеренно. Экран — статика, поэтому файл открывается
 * напрямую и живёт сам по себе: не надо держать окно терминала и нечему
 * упираться в запреты песочницы.
 */
function cmdPreview() {
  if (!name) die("Укажите имя: node scripts/screens.mjs preview my-app");
  const files = screenFiles(name);

  const cards = files.map(({ file, path }) => `
    <figure style="margin:0">
      <figcaption style="font:13px/1.4 system-ui;color:#64748B;margin-bottom:8px">${file}</figcaption>
      <div style="width:375px;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden">
        ${readFileSync(path, "utf8")}
      </div>
    </figure>`).join("\n");

  const out = join(appDir(name), "preview.html");
  writeFileSync(out, `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${name} — превью</title></head>
<body style="margin:0;padding:24px;background:#F1F5F9;font-family:system-ui">
<h1 style="font:600 18px/1.3 system-ui;margin:0 0 20px">${name}: ${files.length} экранов</h1>
<div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">${cards}</div>
</body></html>\n`);

  console.log(`Готово: ${out}`);
  console.log("Откройте этот файл в браузере — двойным щелчком, ничего запускать не нужно.");
}

async function cmdPush() {
  if (!name) die("Укажите имя: node scripts/screens.mjs push my-app");
  const metaPath = join(appDir(name), "meta.json");
  if (!existsSync(metaPath)) die(`Нет meta.json у «${name}»`);
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));

  if (!meta.projectId) {
    die(`Не задан projectId в projects/${name}/meta.json.\n` +
        "  Это проект в кабинете, куда лягут экраны. Возьмите его id и впишите.");
  }

  // Перед отправкой прогоняем ту же проверку: пуш кривых экранов означает
  // ручную уборку в кабинете, а это дороже лишних трёх секунд ожидания.
  const files = screenFiles(name);
  let problems = [];
  for (const { file, path } of files) problems = problems.concat(lint(readFileSync(path, "utf8"), file));
  if (problems.length) {
    console.error("КРАСНО: сначала почините разметку\n");
    for (const p of problems) console.error("  · " + p);
    process.exit(1);
  }

  const body = {
    html: joinScreens(name),
    name_prefix: meta.namePrefix || "Экран",
    ...(meta.pageId ? { page_id: meta.pageId } : {}),
  };
  console.log(`→ отправляю ${files.length} экранов в проект ${meta.projectId}`);
  const r = await apiPost("/api/screens/import-html", body, meta.projectId);
  if (!r.ok) die(`КРАСНО: платформа отклонила (${r.status}): ${r.data?.error || "неизвестно"}`);

  // Платформа возвращает созданные экраны в поле screens, ошибки — отдельно.
  const created = r.data?.screens || [];
  const failed = r.data?.errors || [];
  console.log(`\nЗЕЛЕНО: в кабинете ${created.length} экранов\n`);
  for (const c of created) console.log(`  · ${c.name}`);
  if (failed.length) {
    console.log(`\nНе легли (${failed.length}):`);
    for (const e of failed) console.log(`  · экран ${e.index + 1}: ${e.error}`);
  }
  const q = r.data?.queued;
  if (q && (q.icons || q.images)) {
    console.log(`\nКартинки генерируются: иконок ${q.icons}, изображений ${q.images}.`);
    console.log("В кабинете они появятся сами, когда будут готовы.");
  }
  console.log(`\nОткрыть: ${API}`);
}

const commands = { new: cmdNew, check: cmdCheck, preview: cmdPreview, push: cmdPush };
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
