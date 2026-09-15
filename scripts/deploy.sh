#!/usr/bin/env bash
# Выкат на сервер: scripts/deploy.sh <имя> [порт]
#
# Только по прямой команде владельца — это боевой сервер, где живут клиентские
# проекты. Скрипт НЕ правит Caddyfile сам: конфиг общий на весь сервер, и
# автоматическая правка чужого боевого файла — цена ошибки выше выгоды.
# Вместо этого печатает готовый блок, который вставляется один раз на проект.
set -euo pipefail

LAB="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${1:-}"
PORT="${2:-}"
# Адрес сервера и ключ берём из окружения, а не из кода: репозиторий может
# уехать куда угодно, а прод-адрес светить в нём незачем.
HOST="${DEPLOY_HOST:-}"
USER="${DEPLOY_USER:-root}"
KEY="${TIMEWEB_SSH_KEY_PATH:-}"
REMOTE_DIR="/opt/miniapps/$NAME"

[[ -z "$NAME" ]] && { echo "Укажите имя: scripts/deploy.sh my-app 3410" >&2; exit 1; }
[[ -z "$KEY" ]] && { echo "Нет TIMEWEB_SSH_KEY_PATH — ключа для сервера" >&2; exit 1; }
[[ -z "$HOST" ]] && { echo "Нет DEPLOY_HOST — адреса сервера. Задайте: export DEPLOY_HOST=<адрес>" >&2; exit 1; }
DIR="$LAB/projects/$NAME"
[[ -d "$DIR" ]] || { echo "Нет проекта «$NAME»" >&2; exit 1; }

# Порт из диапазона мини-аппов. Занятый порт — молчаливая беда: pm2 поднимет
# процесс, а он тут же умрёт с EADDRINUSE, и наружу это будет выглядеть как
# «сайт не открывается».
if [[ -z "$PORT" ]]; then
  PORT=$(ssh -o StrictHostKeyChecking=no -i "$KEY" "$USER@$HOST" \
    "for p in \$(seq 3410 3499); do ss -ltn 2>/dev/null | grep -q \":\$p \" || { echo \$p; break; }; done")
  echo "→ свободный порт: $PORT"
fi

echo "→ выкатываю projects/$NAME на $HOST:$REMOTE_DIR"
ssh -o StrictHostKeyChecking=no -i "$KEY" "$USER@$HOST" "mkdir -p '$REMOTE_DIR'"

# .env.local переносим только если на сервере его ещё нет: там боевые токены,
# затирать их локальными тестовыми нельзя.
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude .env.local \
  -e "ssh -o StrictHostKeyChecking=no -i $KEY" \
  "$DIR/" "$USER@$HOST:$REMOTE_DIR/"

ssh -o StrictHostKeyChecking=no -i "$KEY" "$USER@$HOST" bash -s <<EOF
set -e
cd "$REMOTE_DIR"
[ -f .env.local ] || cp .env.example .env.local
npm install --omit=dev=false --silent
NODE_OPTIONS=--max-old-space-size=4096 npm run build
if pm2 describe "$NAME" >/dev/null 2>&1; then
  pm2 restart "$NAME" --update-env
else
  PORT=$PORT pm2 start npm --name "$NAME" -- start
fi
pm2 save >/dev/null 2>&1 || true
EOF

echo
echo "Готово. Процесс pm2: $NAME, порт $PORT"
echo
echo "Если домен ещё не заведён — добавьте в /opt/caddy/Caddyfile на сервере:"
echo
echo "  $NAME.alterda.ru {"
echo "      reverse_proxy 172.17.0.1:$PORT"
echo "  }"
echo
echo "и перезагрузите: docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
echo "Токены бота задаются на сервере в $REMOTE_DIR/.env.local"
