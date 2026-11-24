# Fork agent guide

Agent-only reference for customizing this personal Orca fork. The owner does not read it; optimise for fast lookup by agents. Fork policy (branches, upstream merges, push account, build/install scripts) lives in `/CLAUDE.md` — this guide does not repeat it.

Line numbers below are as of the `v1.4.272` base and drift after upstream merges: treat them as a starting point and confirm with `grep` before editing.

## The change loop

Every customization request runs these steps in order. A step is done only when its criterion holds.

1. **Locate.** Map the owner's words to a region with the vocabulary table below, open that region's file, and find the component. Done when you have the exact render site (file:line) and every other code path that produces the same behaviour (grep the state action / handler, not just the component).
2. **Change minimally.** Prefer, in order: an existing `GlobalSettings` toggle (flip its default or set it in the owner's settings) → a fork switch in a fork-owned file (pattern: `src/renderer/src/components/sidebar/chrome/fork-sidebar-customization.ts`, a `false` constant guarding the upstream JSX) → editing upstream code. Keep upstream JSX, `t()` call sites and i18n keys in place; deleting a `t()` call site fails the localization checks and forces edits to every locale catalog. Done when the diff touches the fewest upstream lines that achieve the request.
3. **Check.** `git checkout -- pnpm-lock.yaml && source ~/.nvm/nvm.sh && nvm use 24 && timeout 900 pnpm check:changed --base=v1.4.272` (use the tag `custom` currently sits on: `git describe --tags --abbrev=0`), then `git checkout -- pnpm-lock.yaml` again. Two traps widen the gate to every check: the default base is `merge-base(origin/main, HEAD)`, which on this fork predates `release: v1.4.272` so `package.json` counts as changed; and a dirty `pnpm-lock.yaml` (this machine's `@pnpm/exe` adds lines on any `pnpm` call, `pnpm exec oxfmt` included). Untracked files are already included, and Markdown is format-checked too: run `pnpm exec oxfmt --write <files>` on every file you touched, docs included. Done when the run ends with `N check(s) passed` and `git status` shows only your files.
4. **Commit and push.** One logical change per commit, Japanese message, author is the repo-configured noreply, no AI trailers. Push with the personal token (see `/CLAUDE.md`). Done when `git log origin/custom -1` is your commit.
5. **Build.** `bash fork/build-mac.sh > ~/Library/Logs/orca-fork-build.log 2>&1` in the background (takes several minutes). Done when it exits 0 and `dist/fork.noindex/mac-arm64/fOrca.app/Contents/Info.plist` version ends with your commit hash.
6. **Install.** `bash fork/install-mac.sh`. It hands off to launchd, quits fOrca, replaces `/Applications/fOrca.app` and reopens it. The official `/Applications/Orca.app` is never touched. **If you run inside fOrca, this kills your session** and every other fOrca agent session; fOrca resumes them with "Orca restarted. Resume the original unfinished user task…". Install only when the owner asked for the change to land (a customization request counts). Done after the restart when `~/Library/Logs/orca-fork-install.log` ends with `終わり` and `/Applications/fOrca.app` reports the new version.
7. **Verify on screen.** Screenshot the owner's running Orca window without focusing it: `mcp__cua-driver__list_windows({pid})` (pid of `/Applications/fOrca.app/Contents/MacOS/fOrca`), then `get_window_state({pid, window_id, include_accessibility_tree:false, display_only:true})` on the 1920×1080 window titled `fOrca`. Done when the screenshot shows the requested change. For pre-install checks of a single component, use component fixtures (`architecture.md`).

## Owner vocabulary → region

The owner writes in Japanese and uses the visible (Japanese locale) labels.

| Owner says                                   | What it is                                                 | Read                                             |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| サイドバー, 左                               | Left sidebar                                               | `sidebar.md`                                     |
| 検索 / タスク / 自動化 / Bots / プロジェクト | Sidebar nav rows and sections                              | `sidebar.md`                                     |
| ワークスペース, ワークツリー, カード         | Workspace cards in the Projects list                       | `sidebar.md`                                     |
| notification, 通知, ベル                     | Bell in Projects header (hidden), OS notifications, toasts | `sidebar.md`, `chrome-settings-notifications.md` |
| タブ, 分割                                   | Top tab strip, split panes                                 | `main-area.md`                                   |
| チャット, 入力欄, モデル                     | Native agent chat transcript and composer                  | `main-area.md`                                   |
| ターミナル                                   | Terminal panes                                             | `main-area.md`                                   |
| 下のバー, 使用済み, CLI updates, ホスト      | Bottom status bar                                          | `chrome-settings-notifications.md`               |
| 設定                                         | Settings page and `GlobalSettings`                         | `chrome-settings-notifications.md`               |
| ショートカット                               | Keyboard shortcuts                                         | `chrome-settings-notifications.md`               |
| 仕組み, 状態, i18n, 検査                     | Store, IPC, i18n, verification tooling                     | `architecture.md`                                |

## Fork customizations so far

Keep this list current: add a row in the same commit as each customization.

| Change                                                                                                                              | Where                                                                                                                    | Commit        |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Disable upstream auto-update for `-local.` builds                                                                                   | `src/main/updater/updater-fork-local-build.ts` and its importers                                                         | `774e011b8cf` |
| Hide the Projects-header bell (it toggled the sidebar into the activity view; it was the only caller of `setSidebarBody('agents')`) | `src/renderer/src/components/sidebar/chrome/fork-sidebar-customization.ts` guards the `<Popover>` in `SidebarHeader.tsx` | `51ea90b62f7` |

## Known side effects of the fork build

- The build is ad-hoc signed (no Team ID), so macOS treats it as a different app from the official one: notification permission resets and Orca shows a "macOS が Orca の通知をブロックしています" card. Re-granting in System Settings → Notifications → Orca fixes it.
- The previous fork build is kept at `~/work/tools/orca-official-backup.noindex/fOrca-previous.app`; the official app at `Orca-official-<version>.app` in the same folder.
