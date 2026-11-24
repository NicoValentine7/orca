# Left sidebar map

Reached from `README.md`. Roots: `R/` = `src/renderer/src/`, `S/` = `src/shared/`, `SB/` = `R/components/sidebar/`. Line numbers as of `v1.4.272`; confirm with grep.

Settings: defaults `S/settings/default-global-settings.ts`, types `S/settings/global-settings-types.ts`, persisted-UI defaults `S/orca-profiles/constants.ts`. Sidebar UI state: `R/store/slices/ui/` (`ui-slice-preference-actions.ts`, `ui-slice-bot-preference-actions.ts`, `ui-slice-view-actions.ts`).

**Hiding rule:** if a setting exists below, flip its default (or tell the owner where the toggle is). Otherwise add a `false` flag to `SB/chrome/fork-sidebar-customization.ts` and wrap the JSX: `{FLAG && (…)}`. No setting hides the Search box, the Projects-header icons, the gear, `?`, Reveal current or the Board button. The app rail reuses `SidebarNav.*` and `SidebarSettingsHelpMenu.*` keys, so those keys stay referenced even if sidebar rows go.

## Shell

- Root `SB/index.tsx:101`, mounted at `R/app-shell/AppWorkspaceShell.tsx:91` (inside `WorktreeSidebar`).
- Body order: `SidebarNav` (315) → Bots and Projects sections (316; order = `sidebarProjectsFirst`, swapped by dragging section headers, 304–313) → `SetupScriptPromptCard` (323) → `SidebarToolbar` (325).
- Resize handle 354–371 (width 220–500, lines 72–73). Project drop overlay 334–351.
- State: `sidebarOpen`, `sidebarWidth`, `sidebarBody` (`'workspaces'|'agents'`, in-memory), `collapsedGroups`, `sidebarProjectsFirst`, `sidebarBotsHeight`.

## Titlebar row above the sidebar — `R/app-shell/chrome/TitlebarLeftControls.tsx`

- "Orca" name `:84-101`. Setting `showTitlebarAppName` (default true); Settings › Appearance (`R/components/settings/appearance/AppearanceInterfaceSection.tsx:304`); right-click "Hide App Name".
- Sidebar toggle `:102-121` → `toggleSidebar` (`R/store/slices/ui/ui-slice-agent-actions.ts:49`).
- Back/forward `:124-161`, shown when `shouldShowWorktreeHistoryControls(activeView)` (`R/app-shell/chrome/titlebar-worktree-history-controls.ts:3`) → `goBackWorktree`/`goForwardWorktree` (`R/store/slices/ui/workspace-navigation-history.ts:286`).

## Nav block — `SB/chrome/SidebarNav.tsx`

| Row (owner's label) | Render                                                                       | Setting (default) / where toggled                                                                                                                                           | Click                                                       |
| ------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 検索 Search         | `:99-131`                                                                    | none                                                                                                                                                                        | `openModal('worktree-palette')`                             |
| Setup guide         | `:132` → `R/components/setup-guide/SetupGuideSidebarEntry.tsx:42`            | UI state `setupGuideSidebarDismissed`; shown while setup incomplete; right-click hide                                                                                       | `openModal('setup-guide')`                                  |
| タスク Tasks        | `:133` → `SB/chrome/SidebarTaskNavButton.tsx:159-226`                        | `showTasksButton` (true); Settings › Appearance › Sidebar (`AppearanceWindowSidebarSection.tsx:277-292`), View menu (`src/main/menu/register-app-menu.ts:218`), right-click | `openTaskPage()`; hover shows provider shortcuts `:189-222` |
| Artifacts           | `:134-162`                                                                   | `showArtifactsButton` (false)                                                                                                                                               | `openArtifactsPage`                                         |
| Skills              | `:163-191`                                                                   | `showSkillsButton` (false)                                                                                                                                                  | `openSkillsPage`                                            |
| 自動化 Automations  | `:192-220`                                                                   | `showAutomationsButton` (true); Appearance `:294-314`, View menu                                                                                                            | `openAutomationsPage`                                       |
| Agent Dashboard     | `:221-225` → `R/components/dashboard/sidebar/AgentDashboardSidebarEntry.tsx` | `experimentalAgentDashboardPopout` (off)                                                                                                                                    | opens dashboard                                             |
| Orca Mobile         | `:226-295`                                                                   | `showMobileButton` (true); Appearance `:316-339`, View menu; EyeOff button; "New" badge `SB/chrome/mobile-sidebar-onboarding-badge.ts`                                      | `openMobilePage`                                            |

Shared right-click menu for nav rows: `SB/chrome/sidebar-nav-controls.tsx:6`.

App rail mode (`experimentalAppRail`, off; `R/components/app-rail/AppRailExperimentalSetting.tsx`): Tasks/Automations/Artifacts/Skills/Mobile and the gear/`?` move to `R/components/app-rail/AppRail.tsx` (mounted `AppWorkspaceShell.tsx:216`; destinations `app-rail-destinations.ts:12`).

## Bots section

- `botsEnabled` (true; `useBotsEnabled` in `R/lib/bot-catalog.ts:191`; Settings `R/components/settings/bots/BotsSettingsPane.tsx:21-35`). Turning it off also stops bots receiving messages and running automations — not a display-only switch; use a fork flag to only hide the section.
- Wrapper + resize seam `SB/SidebarBotsSplit.tsx:87` (separator 192–249, double-click resets). Created at `SB/index.tsx:223-231`.
- Section `R/components/bots/SidebarBotsSection.tsx:65`; header = shared `SB/SidebarSectionHeader.tsx:36` (fold 77–103 → `toggleCollapsedGroup('bots')`). Header actions: `BotSidebarSearch.tsx`, `BotSidebarOptionsMenu.tsx`, "+" menu `:230-308` (New bot / Templates / From link / Import / New group).
- Folded avatars and "+15": `R/components/bots/BotCollapsedPreview.tsx:91`; face click `:183` → `openBotHomeTab`; "+N" `:208-235` expands.
- Rows: `BotSidebarVirtualRows`, `BotSidebarEntry.tsx:57`, `BotGroupRow`, `BotSidebarRow.tsx:63` (context menu :98). Drag-reorder only when `botSidebarView.sortBy==='manual'`.

## Projects header — `SB/chrome/SidebarHeader.tsx`

- Title プロジェクト `:55-58` ("Projects" if `groupBy==='repo'`, else "Workspaces").
- Fold (only with Bots shown) `:64-74`, group key `projects-section`.
- Collapse-all button: portaled from `SB/worktree-list/listing/WorktreeList.tsx:296` into `titleAccessory`; component `SB/worktree-list/controls/ProjectsCollapseAllButton.tsx`.
- Bell `:93-170`, hidden by `SHOW_SIDEBAR_ACTIVITY_BELL`. It set `sidebarBody='agents'`, replacing the list with `R/components/activity/sidebar/SidebarAgentsList.tsx` (`SB/index.tsx:247`). It is the only caller of `setSidebarBody('agents')`; other callers only reset to `'workspaces'`.
- Right icons `SB/chrome/sidebar-header-actions.tsx:113-129`:
  - sliders icon = Workspace options → `SB/worktree-list/controls/SidebarWorkspaceOptionsMenu.tsx:19` → `SidebarOptionsPopover.tsx:74`; items `workspace-options-menu-items.tsx:238` (group by, sort, filters, card style/layout/properties).
  - folder icon = Add project `:13-52` → `AddProjectMenu` → `openModal('add-repo')`.
  - `+` = New workspace `:54-91` → `openModal('new-workspace-composer')`.

## Banners between header and list (`SB/index.tsx` line → file)

241 `R/components/maintenance/terminal-daemon/SeveredTerminalDaemonBanner.tsx` · 242 `StalledTerminalDaemonBanner.tsx` · 265 `R/components/repo/toolchain/LocalGitToolchainScanBanner.tsx` · 266 `SB/worktree-list/listing/StartupWorktreeRefreshStatus.tsx` · 267 `SB/workspace-card/template/WorktreeCardsUpdateNotice.tsx` (until `worktreeCardsUpdateNoticeSeen`) · 268 `WorktreeCardsIntroNotice.tsx` (until `worktreeCardsIntroNoticeSeen`) · 283 `R/components/wsl-move/WslMovedProjectsSection.tsx` · 284 `SB/hidden-projects/HiddenProjectsSection.tsx` · 323 `SB/setup-script-prompts/SetupScriptPromptCard.tsx`. Inline list notices: `SB/worktree-list/rows/notice-rows.tsx`.

## Project group rows

- Dispatcher `SB/worktree-list/rows/virtual-row-dispatch.tsx:122`; header row `rows/SectionHeader.tsx:54` (click toggles collapse :286; drag `SB/worktree-list/drag/project-header-drag.ts`, `project-group-header-drag.ts`).
- Hover actions `:341-401` (`ProjectHeaderActions.tsx:5`): chevron, group menu, "…" menu (`repo-header-project-actions.tsx:130-204`: Project Settings, Change Icon, Worktree visibility, groups, Hide from Sidebar, Remove Project), "+".
- Host headers `rows/HostSectionHeader.tsx`; folder workspaces `rows/folder-row.tsx`.

## Workspace card

- Row `SB/worktree-list/rows/item-row.tsx:56` (pointer drag `SB/worktree-list/drag/use-pointer-drag.ts`).
- Card `SB/workspace-card/surface/WorktreeCard.tsx:9` → controller `controller/use-worktree-card-controller.ts` → `surface/worktree-card-surface.tsx:18` (handlers :106-113).
  - click → `handleClick` (`controller/use-worktree-card-activation-actions.ts:56`) → `activateWorktreeFromSidebar` (`R/lib/workspace/activation/sidebar-worktree-activation.ts:24`); Cmd/Shift-click selects.
  - double-click :170 → `openModal('edit-meta')`.
- Status dot: `surface/worktree-card-status-lane.tsx:13` → `WorktreeCardStatusSlot.tsx:133` (card property `status`). Title-right pills/time: `surface/worktree-card-title-status.tsx:174` → `slots/WorktreeCardSlot.tsx:113,144`.
- Agent sub-row (title · model · "now/1h"): `activity/WorktreeCardAgents.tsx`; compact layout (default, `S/agent-status/presentation/agent-activity-display-mode.ts:3`) renders `activity/worktree-card-compact-agent-row.tsx` (model :266-276, time :205-214, click :318 activates that agent's pane). Full layout uses `R/components/dashboard/DashboardAgentRow`. Model toggle = UI state `showAgentModels` (menu "Agent model"); whole agent row = card property `inline-agents`.
- Card settings: `experimentalNewWorktreeCardStyle` (true), `compactWorktreeCards` (false), `worktreeCardDetailsRow` (`S/worktree/card-display-settings-types.ts:3`); menus in `surface/worktree-card-option-items.tsx:64,119,161`, Settings › Appearance (`AppearanceWindowSidebarSection.tsx:241`), Settings › Experimental (`ExperimentalPane.tsx:294`).

### Card template (`SB/workspace-card/template/`)

- `default-workspace-card.json` is the only template (used at `worktree-card-surface.tsx:55-57`): `vars`, `frame`, `defs.IdentityBlock` (title row 49–143, meta row 145–196), `root` (StatusLane, DetailsHover/IdentityBlock, RemoteBranchConflict, DeleteFailed, LinearSetupPrompt, Agents, ChildToggle; 201–246).
- Node shape `{el, when?, props?, children?}`; a prop value starting with `=` is an expression. Facts (`build-workspace-card-facts.ts:39`): `ws`, `repo`, `host`, `git`, `review`, `links`, `provenance`, `ports`, `lineage`, `place`, `options` (`options.show.*` ← `worktreeCardProperties`, defaults `S/worktree/row-display/card-properties.ts:13`).
- Compiler `card-template-compiler.ts:205` throws on unknown elements/props. Registry `card-element-registry.ts:8` = `card-primitives.tsx` + `card-identity-parts.tsx` + `card-activity-parts.tsx`. Schema `S/workspace-cards/card-template-schema.ts`, `card-expression.ts`.
- Hide one card part: change its node's `when` in the JSON (keep the registry entry, or compilation breaks); per-user parts gated by `options.show.X` are toggled via card properties; sub-parts inside a component (model, time) need a component edit.

### Card right-click menu

`surface/worktree-card-surface.tsx:154` → `SB/workspace-actions/context-menu/WorktreeContextMenu.tsx` (model `use-worktree-context-menu-model.tsx`, handlers `use-worktree-context-menu-commands.ts`). Items in `WorktreeContextMenuView.tsx`: WSL start 172, Sleep/VM 173–192, Mark Read/Unread 193–200, Mute notifications 201, Delete/Remove 206, Edit Details 212, Pin 216, Status 224, Hand to bot 232, Open in 237, Copy ▸ / Parent & Children ▸ / Project Group ▸ (`WorktreeContextMenuSubMenus.tsx`), WSL move 245–248, Remove from Parent 251, Developer (Alt+right-click) 260. Hover details card: `details/worktree-card-details-items.tsx:112`.

## Bottom toolbar — `SB/chrome/SidebarToolbar.tsx:71-114`

- Gear and `?`: `SB/chrome/SidebarSettingsHelpMenu.tsx:41` (hidden with app rail). Gear :47-63 → `openSettingsPage`. `?` :64-79 → `HelpMenu.tsx`, items `SB/chrome/help-menu-controller.tsx:160-250` (Shortcuts, Feedback, Milestones, Onboarding, Docs, Changelog, GitHub, Discord, X, Check for Updates, Restart).
- Bottom-right 1, crosshair = Reveal current: `SB/worktree-list/navigation/ScrollToCurrentWorkspaceToolbarButton.tsx:29` → `requestScrollToCurrentWorkspaceReveal()`.
- Bottom-right 2, kanban = Workspace board: `SidebarToolbar.tsx:79-110` → `toggleWorkspaceBoard` (`SB/workspace-board/surface/useWorkspaceBoardPanel.ts`) → `WorkspaceKanbanDrawer` (`SB/index.tsx:385`).
