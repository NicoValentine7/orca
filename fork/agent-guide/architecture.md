# Architecture, i18n and verification

Reached from `README.md`. Verified on `custom` @ `35af8a8` (base `v1.4.272`).

## Layout

- `src/main/` → Electron main process (~160 domain folders). Entry `src/main/index.ts`; IPC handlers `src/main/ipc/`; persistence `src/main/persistence/`; plugin host `src/main/plugins/`.
- `src/preload/index.ts` → builds `api`, exposed as `window.api` via `contextBridge`. Bridges `src/preload/api/<domain>/*-bridge.ts`, types `api-types.ts` (`PreloadApi`).
- `src/renderer/src/` → React UI (`main.tsx` → `App.tsx`). Other HTML entries in `src/renderer/`: `popout.html`, `space.html`, `fixtures.html`, `web-index.html`.
  - `components/` (~120 feature folders; `ui/` = shadcn primitives), `store/`, `i18n/`, `app-shell/` (root surfaces, startup hydration, `storage/` persistence writers), `lib/` (`class-names.ts` → `cn`), `hooks/` (`ipc-events/` = main→renderer listeners), `runtime/` (RPC clients), `web/` (web/mobile `window.api`), `component-fixtures/`, `assets/main.css`.
- `src/shared/` → cross-process types/logic: `settings/global-settings-types.ts`, `settings/default-global-settings.ts`, `orca-profiles/persisted-ui-state-types.ts`, `i18n/`.
- `src/cli/` → the `orca` CLI. `src/packages/process-host` → `@orca/process-host`, mandatory wrapper for spawning processes. `src/wsl-guest/` → code run inside WSL.
- `mobile/` → Expo companion app, own lockfile (`pnpm -C mobile install`), catalogs `mobile/locales/`. Its web bundle ships inside the desktop app.
- `config/` → tsconfigs, vite/vitest/oxlint configs, ratchet baselines (`*-baseline.txt`), all scripts under `config/scripts/`.
- `resources/` → icons, sounds, bundled skills/plugins. Also: `cloud/`, `native/`, `examples/plugins/`, `tests/` (Playwright E2E), `fork/` (this fork's scripts and this guide).

## State (zustand)

- Store `src/renderer/src/store/index.ts`: one `useAppStore = create<AppState>()(...)` spreading ~50 `create*Slice`. No `persist` middleware. `AppState` in `store/types.ts`.
- Slices `store/slices/<domain>/` (ui, settings, tabs, worktrees, …) plus top-level `repos/`, `terminals/`, `github/`, `workspaces/`, `plugins/`. The UI slice is split into `ui-slice-*-actions.ts`, typed by `ui-slice-contract*.ts`.
- Select one primitive per hook: `useAppStore((s) => s.groupBy)`. Derived objects use `useShallow`. Outside React: `useAppStore.getState()`. Whole-map selectors fail `check:whole-hot-map-selector-ratchet`.
- Settings: `updateSettings(partial)` (`store/slices/settings/create-settings-slice.ts`) → `window.api.settings.set` → `'settings:set'` (`src/main/ipc/settings/`). Type `GlobalSettings`, defaults `src/shared/settings/default-global-settings.ts`. Flipping a default is the cheapest fork change when a toggle already exists.
- Persisted UI layout (sidebar width/open, groupBy, activityBarHidden, …): renderer diffs `store/slices/ui/persisted-ui-write-baseline.ts` → `app-shell/storage/use-persisted-ui-writer.ts` → `'ui:set'` → `src/main/ipc/ui.ts` → `profile-state.db` under `userData/profiles/<id>/`. Boot: `app-shell/startup/use-app-startup-hydration.ts`. Adding a persisted field touches `PersistedUIState`, `PERSISTED_UI_WRITE_BASELINE_FIELD_SET`, sanitizers and `src/main/runtime/rpc/methods/client-state/ui-state-schema-parity.ts`; avoid for small changes.
- Everything else is in-memory (fields commented "Not persisted"), e.g. `sidebarBody`.
- Test helpers: `store/testing/app-store-test-fixture.ts` (`createTestStore`, `seedStore`). `createTestAppStore()` named in `tests/e2e/AGENTS.md` does not exist. E2E builds expose `window.__store`.

## IPC

1. Main: `ipcMain.handle('<domain>:<verb>', …)` in `src/main/ipc/<domain>.ts`, registered in `src/main/ipc/register-core-handlers/register-core-handlers.ts`; validate input with zod.
2. Preload: `ipcRenderer.invoke` in `src/preload/api/<domain>/*-bridge.ts`, type in `*-api.ts`/`api-types.ts`, add to `api` in `src/preload/index.ts` (`satisfies PreloadApi`).
3. Web client: `src/renderer/src/web/web-preload-api.ts` (`withFallback`) needs an implementation or fallback for new namespaces (fixtures and web/mobile use it).
4. Push: `sendToTrustedUIRenderer('ui:stateChanged', …)` in main; renderer listens in `hooks/ipc-events/`.

Remote/web/mobile clients go through runtime RPC (`src/main/runtime/rpc/`).

## i18n

- `const t = useTranslate()` (`@/i18n/use-translate`), `t('dotted.key', 'English fallback', {vars})`. Outside React: `translate()` from `@/i18n/i18n`. A `React.memo` component must also call `useTranslation()` (`check:memo-translate-subscription-ratchet`); render paths must not call bare `translate()`.
- Catalogs `src/renderer/src/i18n/locales/{en,de,es,fr,ja,ko,pt,ru,tr,zh,zh-Hant}.json`, nested objects. `en-runtime-required.json` = English boot bundle holding only keys i18next cannot rebuild from a call-site default. Extractor config `config/i18next.config.ts`.
- Checks in `check:changed`:
  - `localization extraction` (`config/scripts/localization/source-extraction/verify-localization-extraction.mjs`): fails on a key missing from `en.json`, a fallback differing from `en.json` (editing only the inline fallback changes nothing), or an `en.json` key named nowhere in `src/`.
  - `localization catalogs` (`.../catalog-validation/verify-localization-catalogs.mjs`): en vs call sites, locale parity (extra keys / mismatched `{{vars}}` fail; missing translations only report), runtime-required coverage.
  - `localization coverage` (`audit-localization-coverage.mjs --check`): hard-coded visible text / aria-label / placeholder / toast strings fail.
- Deleting a `t()` call site orphans its key → extraction fails and the key turns runtime-required → catalogs fail. The fix would be deleting the key from all 11 locales (plus `config/scripts/locale-catalog/locale-*-key-overrides.mjs`) and `pnpm sync:localization-runtime-catalog`. The fork avoids this: gate the JSX with a fork switch and keep the `t()` calls.
- New copy: add the key, run `pnpm sync:localization-catalog`, then add the Japanese string to `ja.json` by hand (the owner runs the Japanese locale).

## Verification tooling

- Node 24 required (shell default is newer): `source ~/.nvm/nvm.sh && nvm use 24`.
- Gate: see `README.md` step 3. Implementation `config/scripts/preflight/changed-checks/check-changed.mjs`; selection `check-changed-selection.mjs`; options `--force`, `--base=<ref>`, `--related`. Passes are cached.
- Targeted: `pnpm tc:web` (renderer), `pnpm tc:node`, `pnpm tc:cli`, `pnpm test <file> --maxWorkers=2`, `pnpm exec oxlint <files>`, `pnpm exec oxfmt --write <files>`, `pnpm verify:localization-extraction`, `pnpm verify:localization-catalogs`.
- Component fixtures: `pnpm fixtures:shot <id|glob> [--theme dark|light|both] [--scale 2]`, `--list`, `--stop`; PNGs in `.cache/fixtures/`. Id = path under `src/renderer/src/` minus `components/` and `.fixture.tsx`, then `:exportName` (e.g. `sidebar/workspace-actions/deletion/DeleteWorktreeDirtyChangeHint:dirty`). The MCP server `orca-component-fixtures` exposes the same. `sidebar/chrome/` has no fixture; add one with `defineFixture({width, store, setup, interact, render})` beside the component only if a pre-install check is worth it.
- Dev app: `ORCA_BACKGROUND_LAUNCH=1 pnpm dev` (window stays hidden). It writes `out/dev-instance.json` with `cdpUrl` (port 9333+; pin with `REMOTE_DEBUGGING_PORT`); profile `orca-dev`, seed with `pnpm dev:seed-profile`. Screenshot via `chromium.connectOverCDP(cdpUrl)` + `page.screenshot()` (example `tests/tools/benchmarks/workspace-switch-paint-latency.mjs`). Never `show()`/focus. The `$electron` skill named in `AGENTS.md` does not exist on this machine.
- After install, the fastest real check is the on-screen screenshot in `README.md` step 7.
- E2E: `ORCA_BACKGROUND_LAUNCH=1 pnpm test:e2e` (`SKIP_BUILD=1` reuses the build); golden journeys `tests/e2e/golden-journeys/`. Personal UI tweaks do not get tests (`docs/agents-md-refs/test-antipatterns.md`).

## Design system

`docs/STYLEGUIDE.md` (+ `docs/styleguide/*.md`). Tokens only from `src/renderer/src/assets/main.css` (`:root`, `.dark`, `@theme inline`; no raw hex). Primitives `src/renderer/src/components/ui/`; merge classes with `cn` from `@/lib/class-names`. Monochrome, color only for state; Geist; `text-2xs`/`text-3xs`; three elevations; `lucide-react` icons at `size-4`; icon buttons `ghost`; tooltips name controls only. `pnpm lint:design-system`.

## Plugins

Docs `docs/reference/plugin-*.md`, samples `examples/plugins/`, CLI `orca plugin dev load|watch|reload`, `orca plugin install`. Plugins can add sidebar panels, commands, keybindings, hooks, language packs (string overrides), themes, fonts, custom editors, plugin settings, status-bar items. They cannot hide, move or restyle built-in UI. Route recolors, extra panels, commands, shortcuts and string overrides to a plugin; hiding or altering built-ins needs a fork switch.

## Upstream rules that still apply

- Cross-platform (`docs/agents-md-refs/cross-platform-support.md`): metaKey vs ctrlKey by platform, `⌘` vs `Ctrl+` labels, `path.join`, spawn through `@orca/process-host`.
- Check both light and dark themes and folder (non-git) workspaces.
- Pre-commit runs `lint-staged` (oxlint, ast-grep, oxfmt); keep the hook.
