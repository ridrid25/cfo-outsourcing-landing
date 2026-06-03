#!/usr/bin/env bash
# Готовит окружение для скриншотов через предустановленный Playwright Chromium.
# Идемпотентно. Запускается SessionStart-хуком и вручную.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GLOBAL_PW="$(npm root -g 2>/dev/null)/playwright"
BROWSERS="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"

# 1) Локальный node_modules-симлинк на глобальный playwright (ESM-резолвинг).
if [ -d "$GLOBAL_PW" ]; then
  mkdir -p node_modules
  ln -sfn "$GLOBAL_PW" node_modules/playwright
  [ -d "$(npm root -g)/playwright-core" ] && ln -sfn "$(npm root -g)/playwright-core" node_modules/playwright-core
else
  echo "setup-browser: глобальный playwright не найден ($GLOBAL_PW)" >&2
fi

# 2) Проверка наличия браузера (CDN недоступен — только предустановленный кэш).
if [ -d "$BROWSERS" ] && ls "$BROWSERS"/chromium-* >/dev/null 2>&1; then
  echo "setup-browser: OK — Chromium доступен в $BROWSERS"
else
  echo "setup-browser: ВНИМАНИЕ — Chromium не найден в $BROWSERS; скриншоты недоступны" >&2
fi
