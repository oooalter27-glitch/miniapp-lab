#!/usr/bin/env bash
# Превью: scripts/preview.sh <имя> [порт]
#
# Поднимает dev-сервер в фоне и проверяет, что страница реально отдаётся.
# Проверка не формальная: Next отвечает 200 и на сломанной странице, показывая
# экран ошибки, — поэтому смотрим, что в ответе есть содержимое, а не оверлей.
set -uo pipefail

LAB="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:-}"
PORT="${2:-3400}"
[[ -z "$NAME" ]] && { echo "Укажите имя: scripts/preview.sh my-app" >&2; exit 1; }

DIR="$LAB/projects/$NAME"
[[ -d "$DIR" ]] || { echo "Нет проекта «$NAME»" >&2; exit 1; }

PIDFILE="/tmp/preview-$NAME.pid"

# «stop» приходит на месте порта, поэтому разбираем его ПЕРВЫМ. Иначе он
# доезжает до проверки «уже поднят» и печатает http://localhost:stop.
if [[ "${2:-}" == "stop" ]]; then
  if [[ -f "$PIDFILE" ]] && kill "$(cat "$PIDFILE")" 2>/dev/null; then
    rm -f "$PIDFILE"
    echo "Остановлен."
  else
    rm -f "$PIDFILE"
    echo "Не был запущен."
  fi
  exit 0
fi

cd "$DIR"
[[ -d node_modules ]] || npm install --cache /tmp/npmcache --silent

if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Уже поднят: http://localhost:$PORT (остановить: scripts/preview.sh $NAME stop)"
  exit 0
fi

nohup npx next dev -p "$PORT" >/tmp/preview-$NAME.log 2>&1 &
echo $! >"$PIDFILE"

echo "→ жду, пока поднимется"
for _ in $(seq 1 40); do
  sleep 1
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/" 2>/dev/null || echo 000)
  [[ "$code" == "200" ]] && break
done

if [[ "${code:-000}" != "200" ]]; then
  echo "НЕ ПОДНЯЛСЯ. Последние строки лога:"
  tail -20 /tmp/preview-$NAME.log
  exit 1
fi

body=$(curl -s "http://localhost:$PORT/" | head -c 4000)
if grep -qi "build error\|unhandled runtime error" <<<"$body"; then
  echo "Страница открылась, но на ней ошибка Next — смотрите /tmp/preview-$NAME.log"
  exit 1
fi

echo
echo "Превью: http://localhost:$PORT"
echo "Лог:    /tmp/preview-$NAME.log"
echo "Стоп:   scripts/preview.sh $NAME stop"
