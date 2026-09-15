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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LAB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [, , cmd, name, arg3] = process.argv;

const die = (msg) => { console.error(msg); process.exit(1); };
const projectDir = (n) => join(LAB, "projects", n);

/** npm через shell: на Windows это npm.cmd, и без shell:true spawn его не находит. */
function run(command, args, opts = {}) {
  return spawnSync(command, args, { stdio: "inherit", shell: true, ...opts });
}

function ensureDeps(dir) {
  if (existsSync(join(dir, "node_modules"))) return;
  console.log("→ ставлю зависимости (первый запуск)");
  // Без --silent: когда установка падает, причина нужна на экране. Молчаливое
  // «npm install не прошёл» отправляет человека гадать — сеть, права, прокси.
  // Кэш держим внутри песочницы: домашний каталог бывает только для чтения,
  // и тогда npm падает с EROFS на ровном месте.
  const r = run("npm", ["install", "--cache", join(LAB, ".npm-cache")], { cwd: dir });
  if (r.status !== 0) {
    die(
      "\nnpm install не прошёл — причина в выводе выше.\n" +
      "Частое: нет доступа к registry.npmjs.org (прокси/VPN), либо папка занята антивирусом.\n" +
      `Попробуйте руками: cd "${dir}" && npm install`,
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
  if (run("npx", ["tsc", "--noEmit"], { cwd: dir }).status !== 0) {
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
  const child = spawn("npx", ["next", "dev", "-p", port], { cwd: dir, stdio: "inherit", shell: true });
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
