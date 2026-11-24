#!/bin/bash
# 公式の Orca のプロジェクト・ワークスペース・設定・SSH の接続先を、Orca Fork に取り込む。
# 使い方: bash fork/import-official-profile.sh（Orca Fork を終了してから）
#
# 取り込むのは本家の dev-profile-seed.mjs と同じ範囲で、ターミナルの中身・自動化・会話の画面は持ってこない。
# 会話の履歴はエージェント側（~/.claude など）に残るので、Orca Fork の「Agents」から開き直せる。
# 公式のデータは読むだけで書き換えない。Orca Fork に前のデータがあれば、日時付きの名前で横に退避してから入れる。
# 公式とフォークは本家の同じ安定版が土台なので、データの形（スキーマ）はそろっている。
set -euo pipefail
cd "$(dirname "$0")/.."

source "$HOME/.nvm/nvm.sh" >/dev/null
nvm use 24 >/dev/null

support="$HOME/Library/Application Support"
source_dir="$support/orca"
target_dir="$support/orca-fork"

# 先頭で絞る。Orca Fork の裏方（デーモン）は引数に本体のパスを持つので、途中一致だと誤って止まる。
if pgrep -f "^/Applications/Orca Fork.app/Contents/MacOS/Orca Fork( |$)" >/dev/null; then
  echo "Orca Fork を終了してから取り込む" >&2
  exit 1
fi

if [ -d "$target_dir" ]; then
  backup="$target_dir.bak-$(date +%Y%m%d-%H%M%S)"
  mv "$target_dir" "$backup"
  echo "[fork] 前の Orca Fork のデータを退避した: $backup"
fi

node --input-type=module -e "
import { seedDevProfile } from './config/scripts/development/profile-seeding/dev-profile-seed.mjs'
await seedDevProfile({ sourceDir: process.argv[1], targetDir: process.argv[2] })
" "$source_dir" "$target_dir"
echo "[fork] 取り込んだ: $source_dir → $target_dir"
