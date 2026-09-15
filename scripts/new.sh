#!/usr/bin/env bash
# Новый мини-апп из шаблона: scripts/new.sh <имя>
#
# Имя становится папкой в projects/ и именем пакета, поэтому берём только
# латиницу, цифры и дефис — иначе npm ругается на имя пакета уже при install.
set -euo pipefail

LAB="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:-}"

if [[ -z "$NAME" ]]; then
  echo "Укажите имя: scripts/new.sh my-app" >&2
  exit 1
fi
if [[ ! "$NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Имя только из строчных латинских букв, цифр и дефисов: «$NAME» не подходит" >&2
  exit 1
fi

DST="$LAB/projects/$NAME"
if [[ -e "$DST" ]]; then
  echo "Проект «$NAME» уже есть: $DST" >&2
  echo "Другое имя или удалите старый — перезаписывать не буду." >&2
  exit 1
fi

mkdir -p "$DST"
# node_modules и .next не копируем: они тяжёлые и привязаны к своей папке.
tar -C "$LAB/template" --exclude=node_modules --exclude=.next -cf - . | tar -C "$DST" -xf -

# Имя пакета = имя проекта, иначе все мини-аппы называются miniapp-template.
python3 - "$DST/package.json" "$NAME" <<'PY'
import json, sys
p, name = sys.argv[1], sys.argv[2]
d = json.load(open(p, encoding="utf-8"))
d["name"] = name
json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY

cp "$DST/.env.example" "$DST/.env.local" 2>/dev/null || true

echo "Создан: projects/$NAME"
echo "Дальше: scripts/check.sh $NAME  (первый прогон поставит зависимости)"
