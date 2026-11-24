#!/bin/bash
# 公式の Orca と fOrca を並べる形へ、最初の 1 回だけ移る。
# 使い方: bash fork/switch-to-fork-mac.sh
#
# 前の運用で /Applications/Orca.app をフォーク版に入れ替えていたときに使う。本体は launchd に渡して裏で動かし、
#   1. fOrca のビルド（fork/build-mac.sh）が終わるのを待つ
#   2. Orca の中で動いているエージェントが全部止まるのを待つ（30 秒おきに見て、2 回続けて 0 なら進む）
#   3. Orca を終了し、/Applications/Orca.app を退避してあった公式の .app に戻す
#   4. 公式のデータを fOrca に取り込む（fork/import-official-profile.sh）
#   5. fOrca を置いて開く（fork/install-mac.sh --worker）
# 記録は ~/Library/Logs/orca-fork-switch.log。終わりと失敗は mac の通知でも知らせる。
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
log="$HOME/Library/Logs/orca-fork-switch.log"
build_log="$HOME/Library/Logs/orca-fork-build.log"
built_app="$repo/dist/fork.noindex/mac-arm64/fOrca.app"
orca_app="/Applications/Orca.app"
backup_dir="$HOME/work/tools/orca-official-backup.noindex"
label="com.fukuda.orca-fork-switch"
domain="gui/$(id -u)"

if [ "${1:-}" != "--worker" ]; then
  plist="$(mktemp -t orca-fork-switch).plist"
  cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$repo/fork/switch-to-fork-mac.sh</string><string>--worker</string></array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$log</string>
  <key>StandardErrorPath</key><string>$log</string>
</dict>
</plist>
PLIST
  launchctl bootout "$domain/$label" 2>/dev/null || true
  launchctl bootstrap "$domain" "$plist"
  echo "裏で切り替えを待ち始めた。記録: $log"
  exit 0
fi

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
stamp() { date '+%F %T'; }
say() { echo "[$(stamp)] $*"; }
notify() { bash "$HOME/.local/bin/notify-user" "$1" >/dev/null 2>&1 || true; }
fail() {
  say "中止: $1"
  notify "fOrca への切り替えを中止した: $1"
  exit 1
}
orca_running() { pgrep -f "^$orca_app/Contents/MacOS/Orca( |$)" >/dev/null; }

say "切り替えを待ち始める"

# 1. ビルドの終わり
until grep -q '^exit ' "$build_log" 2>/dev/null; do sleep 15; done
# ビルドの最後だけをやり直したときは記録が失敗のままなので、出来上がりの有無で判断する。
[ -d "$built_app" ] || fail "ビルドの出来上がりが無い（$built_app）"
say "ビルドを確かめた: $(defaults read "$built_app/Contents/Info.plist" CFBundleShortVersionString)"

# 2. 動いているエージェントが止まるのを待つ
orca_cli="$orca_app/Contents/Resources/bin/orca"
working_count() {
  "$orca_cli" worktree ps --json --limit 1000 2>/dev/null | /usr/bin/python3 -I -c '
import json, sys
# 親のエージェントだけを数える。子（サブエージェント）は中身が空のまま working で残ることがあり、
# 動いている子がいれば親も working になっている。
data = json.load(sys.stdin)["result"]
print(sum(1 for w in data["worktrees"] for a in w.get("agents") or []
          if a.get("state") == "working" and a.get("paneKey")))
'
}
quiet=0
checks=0
while orca_running; do
  checks=$((checks + 1))
  # 24 時間たっても止まらなければ、何かが詰まっているので諦める。
  [ "$checks" -le 2880 ] || fail "24 時間たってもエージェントが動き続けている"
  count="$(working_count || echo unknown)"
  if [ "$count" = "0" ]; then
    quiet=$((quiet + 1))
    [ "$quiet" -ge 2 ] && break
  else
    quiet=0
  fi
  sleep 30
done
say "動いているエージェントが無くなった"

# 3. Orca を終了して、公式の .app に戻す
official="$(ls -d "$backup_dir"/Orca-official-*.app 2>/dev/null | tail -1 || true)"
[ -n "$official" ] || fail "退避した公式の Orca.app が見つからない（$backup_dir）"
if orca_running; then
  osascript -e 'tell application id "com.stablyai.orca" to quit' || true
  for _ in $(seq 1 600); do
    orca_running || break
    sleep 1
  done
  orca_running && fail "Orca が 10 分たっても終わらない"
fi
if [ -d "$orca_app" ] && codesign -dv "$orca_app" 2>&1 | grep -q '^TeamIdentifier=not set'; then
  old_version="$(defaults read "$orca_app/Contents/Info.plist" CFBundleShortVersionString)"
  rm -rf "$backup_dir/Orca-fork-previous.app"
  mv "$orca_app" "$backup_dir/Orca-fork-previous.app"
  say "前の運用のフォーク版を退避した: $old_version"
fi
if [ ! -d "$orca_app" ]; then
  ditto "$official" "$orca_app"
  say "公式の Orca に戻した: $official"
fi

# 4. 公式のデータを取り込む
bash "$repo/fork/import-official-profile.sh" || fail "データの取り込みに失敗した"

# 5. fOrca を置いて開く
bash "$repo/fork/install-mac.sh" --worker || fail "fOrca を置けなかった"

sleep 20
if pgrep -f "^/Applications/fOrca.app/Contents/MacOS/fOrca( |$)" >/dev/null; then
  say "fOrca が動いている"
  notify "fOrca に切り替えた"
else
  fail "fOrca が起動していない"
fi
say "終わり"
