#!/bin/bash
# 自前ビルドの fOrca.app（dist/fork.noindex/mac-arm64/fOrca.app）を /Applications/fOrca.app に置く。
# 使い方: bash fork/install-mac.sh
#
# 公式の /Applications/Orca.app には触らない。フォーク版が壊れたら、公式の Orca を開けば戻れる。
# fOrca の中のターミナルや会話から呼んでも途中で止まらないよう、本体の処理は launchd に渡して裏で動かす。
# 流れ: fOrca を終了 → 今の fOrca.app を 1 つ前として退避 → 新しいビルドを置く → fOrca を開く。
# 退避先は ~/work/tools/orca-official-backup.noindex/fOrca-previous.app。記録は ~/Library/Logs/orca-fork-install.log。
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
src="$repo/dist/fork.noindex/mac-arm64/fOrca.app"
dest="/Applications/fOrca.app"
bundle_id="com.nicovalentine.orca-fork"
backup="$HOME/work/tools/orca-official-backup.noindex/fOrca-previous.app"
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
  echo "裏で fOrca を置き始めた。記録: $log"
  exit 0
fi

stamp() { date '+%F %T'; }
fork_running() { pgrep -f "^$dest/Contents/MacOS/fOrca( |$)" >/dev/null; }

echo "[$(stamp)] 置き始める: $src"
new_version="$(defaults read "$src/Contents/Info.plist" CFBundleShortVersionString)"

if fork_running; then
  osascript -e "tell application id \"$bundle_id\" to quit" || true
  for _ in $(seq 1 600); do
    fork_running || break
    sleep 1
  done
  if fork_running; then
    echo "[$(stamp)] fOrca が 10 分たっても終わらないので中止した"
    exit 1
  fi
fi

if [ -d "$dest" ]; then
  mkdir -p "$(dirname "$backup")"
  rm -rf "$backup"
  mv "$dest" "$backup"
  echo "[$(stamp)] 前のビルドを退避した: $backup"
fi

ditto "$src" "$dest"
echo "[$(stamp)] 置いた: $new_version"
open "$dest"
echo "[$(stamp)] 終わり"
