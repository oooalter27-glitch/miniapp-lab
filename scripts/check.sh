#!/usr/bin/env bash
# Проверка проекта: scripts/check.sh <имя>
#
# Это та самая проверка, без зелёного результата которой агент не имеет права
# сказать «готово». Гоняет типы и полную сборку — ровно то, что ловит
# несуществующие пропсы, опечатки в импортах и сломанный JSX.
set -uo pipefail

LAB="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:-}"
[[ -z "$NAME" ]] && { echo "Укажите имя: scripts/check.sh my-app" >&2; exit 1; }

DIR="$LAB/projects/$NAME"
[[ -d "$DIR" ]] || { echo "Нет проекта «$NAME» в projects/" >&2; exit 1; }

cd "$DIR"

if [[ ! -d node_modules ]]; then
  echo "→ ставлю зависимости (первый запуск)"
  # Кэш в /tmp: домашний каталог бывает только для чтения, и тогда npm падает
  # с EROFS на ровном месте.
  npm install --cache /tmp/npmcache --silent || { echo "npm install не прошёл"; exit 1; }
fi

echo "→ типы"
npx tsc --noEmit || { echo; echo "КРАСНО: типы не сходятся. Чините и гоните снова."; exit 1; }

echo "→ сборка"
# Памяти по умолчанию не хватает на проектах с десятком экранов.
NODE_OPTIONS=--max-old-space-size=4096 npm run build >/tmp/build-$NAME.log 2>&1 || {
  echo
  echo "КРАСНО: сборка упала. Последние строки:"
  tail -25 /tmp/build-$NAME.log
  exit 1
}

echo
echo "ЗЕЛЕНО: типы и сборка прошли."
grep -E "^(┌|├|└)" /tmp/build-$NAME.log | head -20 || true
