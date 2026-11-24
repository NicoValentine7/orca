# Main area map (everything right of the left sidebar)

Reached from `README.md`. Roots: `R/` = `src/renderer/src/`, `S/` = `src/shared/`. Line numbers as of `v1.4.272`; confirm with grep. Keybinding ids: `S/keybindings/definitions-core-{1..4}.ts`; tab shortcuts handled in `R/components/terminal/keyboard-shortcuts/terminal-workspace-keydown.ts`.

## Mount chain

- `R/app-shell/AppWorkspaceShell.tsx`: workbench `<Terminal/>` :245–262, non-workspace pages `ActivePage` :138–167 (settings, tasks, activity, …), floating button :278, `<RightSidebar/>` :289–306.
- Workbench: `R/components/terminal/workbench/TerminalSurface.tsx` → `TerminalSplitWorkspaceSurfaces.tsx` → `TerminalWorktreeSplitSurface.tsx:62` → `TabGroupSplitLayout` + `WorkspacePaneOverlayLayers.tsx`.
- Terminals, browsers and chats are not rendered inside the tab group: they live in worktree-level overlays (`R/components/tab-group/retained-pane/RetainedPaneHost.tsx`) CSS-anchored to the group body (`TabGroupPanel.tsx:361`). Only the editor renders inline (`TabGroupPanel.tsx:384`). When something "inside a tab" refuses to change, look in the overlay layer.
- `R/components/terminal/workbench/TerminalTitlebarTabs.tsx` is a legacy strip, only used when no tab-group layout exists.

## Tab strip (one per split group)

- Container `R/components/tab-group/TabGroupPanel.tsx:287–357` (`TabBar` :147–251; split focus dimming :261–280). State in the tabs slice: `unifiedTabsByWorktree`, `groupsByWorktree`, `activeGroupIdByWorktree`, `layoutByWorktree` (`R/store/slices/tabs/tabs-slice-contract.ts:23–33`). Pointer-down → `focusGroup` (`tabs-group-actions.ts:147`).
- `R/components/tab-bar/TabBar.tsx:17` via `strip/tab-bar-surface.tsx` (scroll chevrons :134/:203, `WindowedTabStrip` :158); per-type rows `model/TabBarItemRow.tsx` (terminal :159, agent-session/chat :173, room :237, browser :266, editor :304). Fork-titled tabs ("orca fork") use `ForkMarkedName` (:176).
- One tab: `R/components/tab-bar/terminal-tabs/SortableTab.tsx` — root :190, icon :241, pin :250, title :279, colour dot :285, × `SortableTabCloseButton` :310, hover card :336. Pointer-up activates (`strip/tab-strip-pointer-activation.ts`), double-click renames :205, middle-click closes :221, drag reorders. Status icon `terminal-tabs/TerminalTabLeadingIcon.tsx:49` (status from `terminal-tab-activity-status.ts:169`).
- Tab settings: `tabAutoGenerateTitle` (false; Settings › Agents), `confirmClosePinnedTab` (true), `editorPreviewTabsEnabled` (true), `ctrlTabOrderMode` ('mru'). Keys: `tab.close` Mod+W, `tab.rename` Mod+R, `tab.moveLeft`/`tab.moveRight` (unbound).
- Tab context menu `terminal-tabs/SortableTabContextMenu.tsx:165`: split :169, Continue in terminal :182, pin :203, Close/Close Others :222/:227, Change Title :234, Tab Color :242.
- "+" new tab `strip/tab-bar-surface.tsx:247–262`, menu `NewTabMenuContent` :264; agent picker `create-entry/TabBarAgentPickerEntry.tsx`; static items `create-menu/tab-bar-static-create-menu.tsx`; customisable row `create-menu/TabBarCreateRow.tsx`. Settings `newTabMenuLayout`, `floatingTerminalNewTabMenuLayout` (`S/new-tab-menu/new-tab-menu-layout.ts:8`), `mobileEmulatorEnabled`, `agentCmdOverrides`. Keys `tab.newTerminal` Mod+T, `tab.newAgent` Mod+Alt+T.
- コマンド (Quick Commands): `R/components/tab-bar/quick-commands/TabBarQuickCommandsButton.tsx` (button :171, menu :208), mounted `TabGroupPanel.tsx:325`. Hidden without a repo or under 163px width; no setting. Data `terminalQuickCommands`.
- Pane Actions "…" (split groups only): `R/components/tab-group/panel/TabGroupPaneActionsMenu.tsx:58`.
- Top-right panel toggle: `R/app-shell/chrome/RightSidebarToggle.tsx:28`, shown by `AppWorkspaceShell.tsx:230` when the right sidebar is closed → `toggleRightSidebar` (`R/store/slices/right-sidebar/right-sidebar-state.ts:66`). Key `sidebar.right.toggle` Mod+L.

## Split panes

- Tree `R/components/tab-group/TabGroupSplitNodeTree.tsx`: leaf → `TabGroupPanel` :54, split :82, `ResizeHandle` :109 (`setTabGroupSplitRatio`). Drag/drop: `WorkspaceTabDragLayer.tsx`, `drag/TabGroupDropOverlay.tsx`, `drag/tab-drag-drop-commit.ts` → `dropUnifiedTab` (`tabs-drop-actions.ts:27`).
- Move tab Right/Left/Down/Up: `R/components/tab-bar/pane-actions/TabWorkspaceLayoutMenuSection.tsx:63` ("Move Tab to Split") → `tab-move-to-pane-column.ts:52` `moveTabToNewPaneColumn` (needs ≥2 tabs in the group, :41; no default shortcut). Also from `EditorFileTabContextMenu.tsx:108`, `BrowserTab.tsx:264`.
- `createEmptySplitGroup` (`tabs-group-actions.ts:231`), `moveUnifiedTabToGroup` (`tabs-move-actions.ts:17`), `closeEmptyGroup` :182. Empty split landing `landing/SplitPaneLanding.tsx`.

## Terminal panes

- `mounting/TerminalOverlaySlot.tsx:60` → `R/components/terminal-pane/controller/TerminalPaneSurface.tsx:193–390` (search :246, chat portal :256, context menu :257, header :346).
- Header buttons `R/components/terminal-pane/titles/TerminalPaneHeaderOverlay.tsx:209`: hand off :210, Show terminal :237 / Continue in chat :258, split right :264, remove title :288, close :313.
- State (terminals store, `R/store/terminals/terminal-state.ts:36`): `tabsByWorktree`, `terminalLayoutsByTabId`, `expandedPaneByTabId`. Keys `terminal.splitRight` Mod+D, `terminal.splitDown` Mod+Shift+D, `terminal.closePane`.

## Native chat vs terminal agent

1. Structured native chat: `Tab.contentType === 'agent-session'` with a structured `agentSessionAgent` (`isStructuredTab`, `S/agent-session/view/structured-agent-session-tab.ts:12`) → `R/components/native-chat/pane/routing/StructuredAgentSessionPaneOverlayLayer.tsx:66` → `NativeChatView mode="structured"` → `NativeChatStructuredSession.tsx`.
2. Bridge (agent CLI in a terminal shown as chat): `contentType 'terminal'` + `Tab.viewMode === 'chat'` (`S/workspace-layout/tab-groups/tab-types.ts:89`) → `R/components/terminal-pane/chat/TerminalPaneNativeChatPortal.tsx:72` covers the xterm → `NativeChatView.tsx:42` → `NativeChatResolvedView.tsx`. Toggle allowed by `canToggleNativeChat` (`S/native-chat/native-chat-availability.ts:46`); `toggleTabViewMode` (`tabs-label-actions.ts:223`); key `terminal.toggleNativeChat` Mod+Shift+J. Bridge panes show the terminal header above, not the chat header.
3. Launch choice: `nativeChatPreferenceFor` (`S/agent-launch/choices/structured-native-chat-launch-route.ts:58`); per-agent `nativeChatProviders` beats `agentDefaultSurface` (default 'terminal'; Settings › Agents). Blockers (SSH, WSL, custom start dir): `resolveStructuredNativeChatSupport` :73. Routing `R/lib/agent-session/launch/routing/agent-menu-selection.ts:45`.

Most chat state lives in controller hooks (`useStructuredAgentSession`), not zustand.

## Chat pane, top to bottom (`R/components/native-chat/`)

- Root `NativeChatStructuredSession.tsx:262`: header :267, transcript :268–337, dock :338–408. Find `chat.find` Mod+F.
- Row of 4 header icons (hand off, Resume in CLI, Split Right, Chat settings): `pane/actions/NativeChatPaneHeader.tsx:82–150`; settings button `appearance/NativeChatSettingsButton.tsx` (writes `nativeChatAppearance.width`).
- Transcript `NativeChatMessageList.tsx:370–427` (items :405, live activity line :413):
  - "N 個のコマンドを実行しました" tool-run group: `tools/runs/NativeChatToolRun.tsx` (toggle :181), label `native-chat-tool-run-label.ts:33`, placed by `messages/rows/NativeChatAssistantMessageRow.tsx:128`.
  - 質問 question card: `prompts/NativeChatQuestionCardHeader.tsx:94`; live card `NativeChatStructuredSession.tsx:361`; answered `NativeChatTranscriptRow.tsx:207`.
  - "N s 処理中": `conversation/turns/NativeChatWorkingStatus.tsx:48`.
  - 新着 divider: `viewport/new-rows/NativeChatNewRowsMarker.tsx:26`; setting `nativeChatMarkNewMessages` (absent = on, `S/native-chat/settings/native-chat-appearance-settings.ts:42`; Settings › Chat `settings/chat/ChatBehaviorSetting.tsx:178`).
  - "Orca が終了しました" notice: `messages/notices/NativeChatNoticeRow.tsx` (key `components.native-chat.notices.orcaStopQuit`).
  - Right-edge marker rail: `viewport/rail/NativeChatMessageRail.tsx:46` (mounted `NativeChatMessageList.tsx:384`; width gate `use-native-chat-message-rail.ts:192`; no setting).
  - Jump-to-latest pill: `viewport/scroll/NativeChatJumpToLatest.tsx`.
  - Settings: `nativeChatTurnDiffSummary`, `nativeChatCiResultLines`, `nativeChatOpenedPullRequests`, `nativeChatScrollToLatestOnSend`.
- Floating button bottom-right of the chat = Floating workspace: `R/components/floating-terminal/trigger/FloatingTerminalToggleButton.tsx:204`; shown when `floatingTerminalEnabled` (true) and `floatingTerminalTriggerLocation === 'floating-button'` (default) (`workspace/use-floating-workspace-panel.ts:127`); Settings › Floating Workspaces; key `floatingTerminal.toggle` Mod+Alt+A.

## Composer (`R/components/native-chat/composer/`)

- `NativeChatComposerPane.tsx:364` → `editor/NativeChatComposerField.tsx` (editor :252, actions :314, footer :346). Keys `editor/use-native-chat-composer-keydown.ts`; Esc/stop `submit/use-native-chat-composer-interrupt.ts`.
- Placeholder: `controls/native-chat-composer-placeholder.ts:36`. With any bot present the text is `bots.chat.mentionPlaceholder` (`R/components/bots/use-bot-chat-composer-room.tsx:147`); that key has no `ja.json` entry, so it shows in English for the owner.
- Controls `controls/NativeChatComposerActions.tsx`, each with a priority; `NativeChatComposerToolbar.tsx` overflows low-priority ones as width shrinks. Hide a control by gating its array entry:
  - left :197 — `+` attach (`NativeChatAttachButton.tsx`) :198; permission chip (`session/options/controls/NativeChatPermissionModePicker.tsx:290`) :201; 計画 plan chip :211 (only while `interactionMode === 'plan'`; click exits plan mode).
  - right :241 — model/effort picker (`NativeChatSessionOptionPickers.tsx:348`, persisted `nativeChatSessionOptions`) :242; context-usage ring (`usage/NativeChatContextUsageRing.tsx:96`) :254; mic (`NativeChatDictationButton.tsx`, `voice.*` settings) :263.
  - Send/Stop :160–175.
- Context line under the composer (host / folder / branch): `controls/NativeChatComposerWorkspace.tsx:126` (host :128, folder click copies :146, branch picker `NativeChatComposerBranchPicker.tsx` :191).
- Settings: `nativeChatQueueFollowUps`, `nativeChatComposerSpellcheck`, `nativeChatPromptSuggestions`, `nativeChatLinkPreviews`, `nativeChatResumeWorkOnRestart`, `nativeChatAutoName`, `nativeChatAppearance`.

## Browser, editor, right sidebar, activity page

- Browser: tab `R/components/tab-bar/browser-tabs/BrowserTab.tsx`; pane `R/components/browser-pane/assemble-chrome/BrowserPaneOverlayLayer.tsx` → `browser-workspace-pane.tsx:33`. State `browserTabsByWorktree`, `browserPagesByWorkspace`.
- Editor/diff: `R/components/editor/EditorPanel.tsx:316` → `EditorContent.tsx` (combined diff :192, `CombinedDiffViewer.tsx`), mounted `TabGroupPanel.tsx:395`; state `openFiles`. diff, conflict-review, check-details and git-graph all render as the editor.
- Right sidebar `R/components/right-sidebar/RightSidebar.tsx:58`: top activity bar :319 (`activity-bar/right-sidebar-top-activity-bar.tsx`), close :254, panels `right-sidebar-panel-content.tsx`, tab ids `activity-bar/right-sidebar-default-activity-items.ts`. State `rightSidebarOpen`, `rightSidebarTab`, `rightSidebarWidth`, `activityBarPosition`, `activityBarOrder`.
- Activity page (`activeView === 'activity'`, `openActivityPage` in `ui-slice-view-actions.ts:8`): `R/components/activity/ActivityPrototypePage.tsx` (list :321, detail :352). Distinct from the sidebar activity body behind the hidden bell (`sidebar.md`).
