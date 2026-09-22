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

const commands = { new: cmdNew };
const fn = commands[cmd];
if (!fn) {
  console.log(`Команды:
  node scripts/screens.mjs new <имя>       создать из шаблона
  node scripts/screens.mjs check <имя>     проверить экраны
  node scripts/screens.mjs preview <имя>   посмотреть в браузере
  node scripts/screens.mjs push <имя>      отправить в билдер`);
  process.exit(cmd ? 1 : 0);
}
fn();
