#!/bin/bash
# フォークの Orca を、この mac（Apple シリコン）向けの .app としてビルドする。
# 使い方: bash fork/build-mac.sh
# 出力は dist/mac-arm64/Orca.app。入れ替えは fork/install-mac.sh で行う。
set -euo pipefail
cd "$(dirname "$0")/.."

source "$HOME/.nvm/nvm.sh" >/dev/null
nvm use 24 >/dev/null

# この端末の pnpm は @pnpm/exe なので、ビルド中の install がロックファイルに 1 行足す。
# 終わったら（途中で落ちても）元の中身に戻す。
lock_root="$(mktemp)"
lock_mobile="$(mktemp)"
cp pnpm-lock.yaml "$lock_root"
cp mobile/pnpm-lock.yaml "$lock_mobile"
restore_lockfiles() {
  cp "$lock_root" pnpm-lock.yaml
  cp "$lock_mobile" mobile/pnpm-lock.yaml
  rm -f "$lock_root" "$lock_mobile"
}
trap restore_lockfiles EXIT

pnpm install --frozen-lockfile
# mobile/ の依存は、デスクトップ版に同梱するスマホ用の画面のビルドに要る。
pnpm -C mobile install --frozen-lockfile

pnpm run build:desktop
pnpm run build:computer-macos
# この端末の Command Line Tools には Intel 向けの Swift の部品が無いので、Apple シリコン向けだけを作る。
pnpm run build:keyboard-layout-macos -- --single-arch
pnpm run build:process-footprint-macos -- --single-arch
pnpm run build:notification-status-macos -- --single-arch
pnpm run ensure:electron-runtime

# 本家の build:mac と同じ形のバージョンにする（例: 1.4.272-local.<時刻>.<コミット>）。
# バージョンに -local. が入ったビルドは、フォーク側の変更で本家の自動更新を止める。
commit="$(git rev-parse --short=12 HEAD)"
base="$(node -p "require('./package.json').version")"
export ORCA_BUILD_COMMIT="$commit"
export ORCA_LOCAL_BUILD_VERSION="${base}-local.$(date +%s)000.${commit}"
echo "[fork] version ${ORCA_LOCAL_BUILD_VERSION}"

pnpm exec electron-builder --config config/electron-builder.config.cjs --mac dir --arm64

# 署名用の証明書が無いと electron-builder は署名を飛ばし、.app 全体の署名が壊れたままになる。
# 中身ごと ad-hoc（証明書なし）で署名し直して、整合を取る。
app="dist/mac-arm64/Orca.app"
codesign --force --deep --sign - --entitlements resources/build/entitlements.mac.plist "$app"
codesign --verify --deep --strict "$app"
echo "[fork] built $app"
