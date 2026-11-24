#!/bin/bash
# 自前ビルドの Orca.app（dist/mac-arm64/Orca.app）を /Applications/Orca.app と入れ替える。
# 使い方: bash fork/install-mac.sh
#
# Orca の中のターミナルや会話から呼んでも途中で止まらないよう、本体の処理は launchd に渡して裏で動かす。
# 流れ: Orca を終了 → 今の /Applications/Orca.app を退避 → 自前ビルドを置く → Orca を開く。
# 退避先は ~/work/tools/orca-official-backup/。公式に戻すときは、退避した .app を /Applications/Orca.app に戻す。
# 記録は ~/Library/Logs/orca-fork-install.log。
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
src="$repo/dist/mac-arm64/Orca.app"
dest="/Applications/Orca.app"
backup_dir="$HOME/work/tools/orca-official-backup"
log="$HOME/Library/Logs/orca-fork-install.log"
label="com.fukuda.orca-fork-install"
domain="gui/$(id -u)"

if [ "${1:-}" != "--worker" ]; then
  if [ ! -d "$src" ]; then
    echo "先に bash fork/build-mac.sh でビルドする（$src が無い）" >&2
    exit 1
  fi
  plist="$(mktemp -t orca-fork-install).plist"
  cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$repo/fork/install-mac.sh</string><string>--worker</string></array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$log</string>
  <key>StandardErrorPath</key><string>$log</string>
</dict>
</plist>
PLIST
  launchctl bootout "$domain/$label" 2>/dev/null || true
  launchctl bootstrap "$domain" "$plist"
  echo "裏で入れ替えを始めた。記録: $log"
  exit 0
fi

stamp() { date '+%F %T'; }
main_running() { pgrep -f "^$dest/Contents/MacOS/Orca( |$)" >/dev/null; }

echo "[$(stamp)] 入れ替えを始める: $src"
new_version="$(defaults read "$src/Contents/Info.plist" CFBundleShortVersionString)"

osascript -e 'tell application id "com.stablyai.orca" to quit' || true
for _ in $(seq 1 600); do
  main_running || break
  sleep 1
done
if main_running; then
  echo "[$(stamp)] Orca が 10 分たっても終わらないので中止した"
  exit 1
fi

if [ -d "$dest" ]; then
  mkdir -p "$backup_dir"
  old_version="$(defaults read "$dest/Contents/Info.plist" CFBundleShortVersionString)"
  if codesign -dv "$dest" 2>&1 | grep -q '^TeamIdentifier=not set'; then
    # 前の自前ビルドは作り直せるので、1 つだけ残す。
    target="$backup_dir/Orca-fork-previous.app"
  else
    target="$backup_dir/Orca-official-$old_version.app"
  fi
  rm -rf "$target"
  mv "$dest" "$target"
  echo "[$(stamp)] 退避した: $old_version → $target"
fi

ditto "$src" "$dest"
echo "[$(stamp)] 置いた: $new_version"
open "$dest"
echo "[$(stamp)] 終わり"
