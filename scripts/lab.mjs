#!/usr/bin/env node
/**
 * Песочница мини-аппов — единая команда для Windows, macOS и Linux.
 *
 *   node scripts/lab.mjs new <имя>
 *   node scripts/lab.mjs check <имя>
 *   node scripts/lab.mjs preview <имя> [порт]
 *   node scripts/lab.mjs stop <имя>
 *
 * Почему не bash: на Windows .sh не запускается без Git Bash или WSL, а
 * агент зовёт команды через тот shell, что дала система. Node здесь есть
 * всегда — на нём же собирается сам мини-апп.
 */
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LAB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [, , cmd, name, arg3] = process.argv;

const die = (msg) => { console.error(msg); process.exit(1); };
const projectDir = (n) => join(LAB, "projects", n);

const IS_WIN = process.platform === "win32";

/**
 * Запуск npm/npx. На Windows это .cmd-обёртки, их spawn не находит по голому
 * имени — поэтому дописываем расширение сами, а не включаем shell.
 *
 * Через shell было бы короче, но тогда аргументы склеиваются в строку без
 * экранирования: путь вида «C:\...\Риелторский миниап» с пробелом ломается,
 * а Node 24 отдельно предупреждает об этом как о дыре (DEP0190).
 */
function bin(command) {
  return IS_WIN && !command.endsWith(".cmd") ? `${command}.cmd` : command;
}

function run(command, args, opts = {}) {
  return spawnSync(bin(command), args, { stdio: "inherit", ...opts });
}

/**
 * Установлены ли зависимости по-настоящему.
 *
 * Наличия папки node_modules мало: оборванная установка оставляет её на месте,
 * но без node_modules/.bin — и тогда `tsc` с `next` просто не находятся, а
 * повторный npm install считает, что всё уже стоит, и ничего не чинит.
 */
function depsReady(dir) {
  return existsSync(join(dir, "node_modules", ".bin", "next"))
    || existsSync(join(dir, "node_modules", ".bin", "next.cmd")); // Windows
}

function ensureDeps(dir) {
  if (depsReady(dir)) return;
  if (existsSync(join(dir, "node_modules"))) {
    console.log("→ прошлая установка оборвалась, ставлю заново");
    rmSync(join(dir, "node_modules"), { recursive: true, force: true });
  }
  console.log("→ ставлю зависимости (первый запуск)");
  // Без --silent: когда установка падает, причина нужна на экране. Молчаливое
  // «npm install не прошёл» отправляет человека гадать — сеть, права, прокси.
  //
  // Кэш — обычный, системный. Сюда когда-то был вписан кэш внутри песочницы
  // (обход read-only домашнего каталога), и он утащил в репозиторий 186 МБ
  // мусора, после чего `git pull` стал ругаться на «локальные изменения».
  // Кому нужен свой кэш — задаёт npm_config_cache в окружении.
  let r = run("npm", ["install"], { cwd: dir });

  if (r.status !== 0) {
    // Вторая попытка с кэшем во временной папке: на части машин системный
    // кэш недоступен на запись, и npm падает с EROFS/EACCES, хотя сеть и
    // права на сам проект в порядке. Временная папка — не репозиторий:
    // кэш внутри песочницы однажды уехал в git и сломал pull всем.
    const tmpCache = join(tmpdir(), "miniapp-lab-npm-cache");
    console.log(`\n→ повторяю установку с запасным кэшем: ${tmpCache}`);
    // Сносим то, что успела наложить неудачная попытка. Без этого npm считает
    // пакеты уже стоящими и не пересоздаёт node_modules/.bin — установка
    // «проходит», а потом tsc не находится.
    rmSync(join(dir, "node_modules"), { recursive: true, force: true });
    r = run("npm", ["install", "--cache", tmpCache], { cwd: dir });
  }

  if (r.status !== 0) {
    die(
      "\nnpm install не прошёл — причина в выводе выше.\n" +
      "Частое: нет доступа к registry.npmjs.org (прокси/VPN), либо папка занята антивирусом.\n" +
      `Проверить сеть: npm ping\n` +
      `Попробовать руками: cd "${dir}" && npm install`,
    );
  }
}

function cmdNew() {
  if (!name) die("Укажите имя: node scripts/lab.mjs new my-app");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    die(`Имя только из строчных латинских букв, цифр и дефисов: «${name}» не подходит`);
  }
  const dst = projectDir(name);
  if (existsSync(dst)) die(`Проект «${name}» уже есть. Другое имя или удалите старый — перезаписывать не буду.`);

  mkdirSync(dst, { recursive: true });
  cpSync(join(LAB, "template"), dst, {
    recursive: true,
    filter: (src) => !src.includes("node_modules") && !src.includes(`${".next"}`),
  });

  // Имя пакета = имя проекта, иначе все мини-аппы зовутся miniapp-template.
  const pkgPath = join(dst, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const env = join(dst, ".env.local");
  if (!existsSync(env) && existsSync(join(dst, ".env.example"))) {
    cpSync(join(dst, ".env.example"), env);
  }

  console.log(`Создан: projects/${name}`);
  console.log(`Дальше: node scripts/lab.mjs check ${name}`);
}

function cmdCheck() {
  if (!name) die("Укажите имя: node scripts/lab.mjs check my-app");
  const dir = projectDir(name);
  if (!existsSync(dir)) die(`Нет проекта «${name}» в projects/`);
  ensureDeps(dir);

  console.log("→ типы");
  // Через npm-скрипт, а не npx: npx при отсутствии бинаря в node_modules/.bin
  // молча уходит в реестр за пакетом «tsc» (это вообще другой пакет) и падает
  // сетевой ошибкой, выдавая её за ошибку типов.
  if (run("npm", ["run", "typecheck"], { cwd: dir }).status !== 0) {
    die("\nКРАСНО: типы не сходятся. Чините и гоните снова.");
  }

  console.log("→ сборка");
  const build = run("npm", ["run", "build"], {
    cwd: dir,
    // Памяти по умолчанию не хватает на проектах с десятком экранов.
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
  });
  if (build.status !== 0) die("\nКРАСНО: сборка упала — смотрите вывод выше.");

  console.log("\nЗЕЛЕНО: типы и сборка прошли.");
}

function cmdPreview() {
  if (!name) die("Укажите имя: node scripts/lab.mjs preview my-app");
  const dir = projectDir(name);
  if (!existsSync(dir)) die(`Нет проекта «${name}»`);
  ensureDeps(dir);

  const port = arg3 || "3400";
  console.log(`→ поднимаю на http://localhost:${port}`);
  console.log("   Ctrl+C — остановить\n");

  // Держим в текущем терминале: так человек сразу видит ошибки сборки,
  // а не ищет их в файле лога.
  const child = spawn(bin("npx"), ["next", "dev", "-p", port], { cwd: dir, stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 0));
}

function cmdStop() {
  console.log("Превью останавливается через Ctrl+C в том окне, где оно запущено.");
}

const commands = { new: cmdNew, check: cmdCheck, preview: cmdPreview, stop: cmdStop };
const fn = commands[cmd];
if (!fn) {
  console.log(`Команды:
  node scripts/lab.mjs new <имя>              создать проект из шаблона
  node scripts/lab.mjs check <имя>            типы + сборка
  node scripts/lab.mjs preview <имя> [порт]   поднять и открыть`);
  process.exit(cmd ? 1 : 0);
}
fn();
