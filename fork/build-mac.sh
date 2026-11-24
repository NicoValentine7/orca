#!/bin/bash
# フォークの Orca を、この mac（Apple シリコン）向けの .app としてビルドする。
# 使い方: bash fork/build-mac.sh
# 出力は dist/mac-arm64/Orca.app。入れ替えは fork/install-mac.sh で行う。
set -euo pipefail
cd "$(dirname "$0")/.."

source "$HOME/.nvm/nvm.sh" >/dev/null
nvm use 24 >/dev/null

# この端末の pnpm は @pnpm/exe なので、install がロックファイルに 1 行足す。中身はそのまま戻す。
lock_backup="$(mktemp)"
cp pnpm-lock.yaml "$lock_backup"
pnpm install --frozen-lockfile
cp "$lock_backup" pnpm-lock.yaml
rm -f "$lock_backup"

pnpm run build:desktop
pnpm run build:computer-macos
pnpm run build:keyboard-layout-macos
pnpm run build:process-footprint-macos
pnpm run build:notification-status-macos
pnpm run ensure:electron-runtime

# 本家の build:mac と同じ形のバージョンにする（例: 1.4.272-local.<時刻>.<コミット>）。
# バージョンに -local. が入ったビルドは、フォーク側の変更で本家の自動更新を止める。
commit="$(git rev-parse --short=12 HEAD)"
base="$(node -p "require('./package.json').version")"
export ORCA_BUILD_COMMIT="$commit"
export ORCA_LOCAL_BUILD_VERSION="${base}-local.$(date +%s)000.${commit}"
echo "[fork] version ${ORCA_LOCAL_BUILD_VERSION}"

pnpm exec electron-builder --config config/electron-builder.config.cjs --mac dir --arm64
