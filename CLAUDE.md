@AGENTS.md

# このフォークの運用

カスタマイズの依頼（画面のどこかを消す・変える・足す）は、着手前に `fork/agent-guide/README.md` を読む。直す場所の地図と、直す・検査・入れ替え・画面確認の手順がある。

このリポジトリは stablyai/orca の個人用フォーク（NicoValentine7/orca）。別物のアプリにはせず、Orca として使いながら個人用の小さなカスタマイズだけを足す。

- リモートは `origin`（フォーク）と `upstream`（本家。push は無効、取得は blob を後から取る形）。本家へ PR は出さない
- 日常で使うブランチは `custom`。本家の安定版のタグ（例: `v1.4.272`）を土台にして、その上に自分の変更を積む。`main` は本家の main を追うだけにし、自分の変更は積まない
- 土台を本家の main でなくタグにするのは、プロファイルのデータベースの形（スキーマ）を公式の安定版とそろえるため。main のほうが新しい形だと、公式の Orca に戻したときに「新しいバージョンで保存されたプロファイル」として開けなくなる
- 本家の更新はコミットをそのまま全部取り込まず、中身を見て選ぶ。新しい安定版に上げるときは `git merge vX.Y.Z` でタグを `custom` に合流させる。個別の修正だけ欲しいときは `git cherry-pick -x` で拾い、前提になるコミットが抜けていないかを確かめる
- 自分の変更は小さなコミットに分け、本家のファイルの書き換えは最小限にする。新しいファイルで済むものはそちらを使い、本家のプラグインの仕組みで済むものはフォークに入れない
- フォークは公開リポジトリなので、業務の情報・秘密値・社内の構成を入れない。コミットの著者は個人用の noreply のメール（リポジトリの git 設定に入れてある）にする
- gh の既定のアカウントは仕事用で、そのままだと push が 403 になる。既定は切り替えず、`GH_TOKEN="$(gh auth token --user NicoValentine7)" git push origin custom` で個人のアカウントの権限だけを渡す
- 本家の画面の部品を消すと、文言の一覧の検査（localization）が落ち、全言語のファイルを直すことになる。部品は残し、`src/renderer/src/components/sidebar/chrome/fork-sidebar-customization.ts` のようなフォーク用の設定で描かないようにする

## ビルドと置き方

フォーク版は「Orca Fork」という別のアプリとして、公式の Orca の横に置く。普段は Orca Fork を使い、壊れたら公式の Orca を開いて戻る。安定した変更だけを `custom` に入れる（2026-11-24 本人の決定）。

- `bash fork/build-mac.sh` で `dist/mac-arm64/Orca Fork.app` を作る。バージョンは `1.4.272-local.<時刻>.<コミット>` の形になる
- 別名にするのは `config/fork-app-identity.cjs`（`ORCA_FORK_APP=1` のときだけ効く）。バンドル ID は `com.nicovalentine.orca-fork`、データの置き場は `~/Library/Application Support/orca-fork` で、公式の `orca` とは分かれる。`orca://` の URL は公式に任せる
- バージョンに `-local.` が入ったビルドは、`src/main/updater/updater-fork-local-build.ts` の判定で本家の自動更新を止める
- `bash fork/install-mac.sh` で `/Applications/Orca Fork.app` を置き換える。公式の `/Applications/Orca.app` には触らない。Orca Fork を終了してから置くので、Orca Fork の中で動く会話やエージェントは止まる
- `bash fork/import-official-profile.sh` で、公式の Orca のプロジェクト・ワークスペース・設定・SSH の接続先を Orca Fork に取り込む（Orca Fork を終了してから）。同期ではなく、そのときの写しで、Orca Fork の前のデータは日時付きの名前で横に退避する
- 公式とフォークで分かれないもの: `~/.orca` の下（エージェントのフック、API キーのファイル、Google などの接続）。鍵はアプリごとの Keychain の鍵で暗号化されるので、Orca の account のサインインと API キーは Orca Fork 側で入れ直す
