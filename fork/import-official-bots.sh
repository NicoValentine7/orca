#!/bin/bash
# 公式の Orca の Bots を fOrca に写す。import-official-profile.sh（本家の dev-profile-seed.mjs）は Bots を持ってこない。
# 使い方: bash fork/import-official-bots.sh
#
# fOrca の中から呼んでも止まらないよう、本体は launchd に渡して裏で動かす。
# 流れ: fOrca の中で動いているエージェントが止まるのを待つ → fOrca を終了 → Bots を写す → fOrca を開く。
# 写すもの: プロファイルの bots と botsPermissionDefaultMigrated、userData の bot-* のファイルとフォルダ。
# 公式のデータは読むだけ。fOrca 側の上書きする前のものは orca-fork/bot-import-backup-<日時>/ に退避する。
# 公式と fOrca を同時に開くと、同じ Bot の見回りが 2 回走るので、どちらか片方だけを開く。
# 記録は ~/Library/Logs/orca-fork-bots.log。
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
app="/Applications/fOrca.app"
bundle_id="com.nicovalentine.orca-fork"
support="$HOME/Library/Application Support"
source_dir="$support/orca"
target_dir="$support/orca-fork"
log="$HOME/Library/Logs/orca-fork-bots.log"
label="com.fukuda.orca-fork-bots"
domain="gui/$(id -u)"

if [ "${1:-}" != "--worker" ]; then
  plist="$(mktemp -t orca-fork-bots).plist"
  cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$repo/fork/import-official-bots.sh</string><string>--worker</string></array>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$log</string>
  <key>StandardErrorPath</key><string>$log</string>
</dict>
</plist>
PLIST
  launchctl bootout "$domain/$label" 2>/dev/null || true
  launchctl bootstrap "$domain" "$plist"
  echo "裏で Bots の写しを待ち始めた。記録: $log"
  exit 0
fi

export PATH="/usr/bin:/bin:/usr/sbin:/sbin"
stamp() { date '+%F %T'; }
say() { echo "[$(stamp)] $*"; }
notify() { bash "$HOME/.local/bin/notify-user" "$1" >/dev/null 2>&1 || true; }
fail() {
  say "中止: $1"
  notify "fOrca への Bots の写しを中止した: $1"
  exit 1
}
fork_running() { pgrep -f "^$app/Contents/MacOS/fOrca( |$)" >/dev/null; }

say "始める"

working_count() {
  ORCA_USER_DATA_PATH="$target_dir" "$app/Contents/Resources/bin/orca" worktree ps --json --limit 1000 2>/dev/null | /usr/bin/python3 -I -c '
import json, sys
data = json.load(sys.stdin)["result"]
print(sum(1 for w in data["worktrees"] for a in w.get("agents") or []
          if a.get("state") == "working" and a.get("paneKey")))
'
}
quiet=0
checks=0
unknown=0
while fork_running; do
  checks=$((checks + 1))
  [ "$checks" -le 2880 ] || fail "24 時間たってもエージェントが止まらない"
  count="$(working_count 2>>"$log" || echo unknown)"
  if [ "$count" = "unknown" ]; then
    unknown=$((unknown + 1))
    [ "$unknown" -lt 5 ] || fail "fOrca の CLI からエージェントの数が読めない"
  else
    unknown=0
  fi
  if [ "$count" = "0" ]; then
    quiet=$((quiet + 1))
    [ "$quiet" -ge 2 ] && break
  else
    quiet=0
  fi
  sleep 30
done
say "動いているエージェントが無くなった"

if fork_running; then
  osascript -e "tell application id \"$bundle_id\" to quit" || true
  for _ in $(seq 1 600); do
    fork_running || break
    sleep 1
  done
  fork_running && fail "fOrca が 10 分たっても終わらない"
fi
say "fOrca を終了した"

source_db="$(ls "$source_dir"/profiles/*/profile-state.db | head -1)"
profile="$(basename "$(dirname "$source_db")")"
target_db="$target_dir/profiles/$profile/profile-state.db"
[ -f "$target_db" ] || fail "fOrca のプロファイルが無い（$target_db）"

backup="$target_dir/bot-import-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup"
sqlite3 "$target_db" ".backup '$backup/profile-state.db'"

# 行の revision はプロファイルの revision を超えられないので、次の revision を振り直して入れる。
sqlite3 "$target_db" <<SQL
.bail on
ATTACH 'file:$source_db?mode=ro' AS src;
BEGIN IMMEDIATE;
CREATE TEMP TABLE next_rev AS
  SELECT CAST(value AS INTEGER) + 1 AS rev FROM main.profile_state_meta WHERE key = 'revision';
INSERT OR REPLACE INTO main.profile_state_documents
  (domain, payload, domain_version, revision, updated_at, content_hash)
  SELECT domain, payload, domain_version, (SELECT rev FROM next_rev), CAST(strftime('%s','now') AS INTEGER) * 1000, content_hash
  FROM src.profile_state_documents
  WHERE domain IN ('bots', 'botsPermissionDefaultMigrated', 'botsNewerAgents', 'botOrder');
UPDATE main.profile_state_meta SET value = CAST((SELECT rev FROM next_rev) AS TEXT) WHERE key = 'revision';
COMMIT;
SQL
say "プロファイルの Bots を写した: $(sqlite3 "$target_db" "select group_concat(domain, ', ') from profile_state_documents where domain like 'bot%'")"

for name in bot-items.sqlite bot-work.sqlite bot-look-around.json bot-memory-history bot-linked-skills; do
  [ -e "$source_dir/$name" ] || continue
  if [ -e "$target_dir/$name" ]; then
    mv "$target_dir/$name" "$backup/"
  fi
  if [ "${name##*.}" = "sqlite" ]; then
    sqlite3 "file:$source_dir/$name?mode=ro" ".backup '$target_dir/$name'"
  else
    cp -R "$source_dir/$name" "$target_dir/$name"
  fi
  say "写した: $name"
done

# 続けて fork/install-mac.sh --worker で新しいビルドを置くときは、ここで開かない（開いてすぐ閉じることになる）。
[ "${ORCA_FORK_BOTS_NO_OPEN:-}" = 1 ] || open "$app"
say "終わり（前のものは $backup）"
notify "fOrca に Bots を写した"
