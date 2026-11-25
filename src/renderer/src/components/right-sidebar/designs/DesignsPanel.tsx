import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileImage, House, Plus, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/index'
import { useActiveWorktree } from '@/store/workspaces/selection/use-selected-worktree'
import { useRepoById } from '@/store/repos/use-repository-catalog'
import { runtimeEnvironmentIdOrLocalUnlessTwin } from '@/lib/workspace/ownership/worktree-runtime-owner'
import { useTranslate } from '@/i18n/use-translate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DESIGN_FILE_EXTENSION,
  DESIGNS_GUEST_MESSAGES,
  DESIGNS_THEME_TOKENS,
  isDesignFileName,
  OPENPENCIL_PARTITION,
  OPENPENCIL_START_URL,
  type DesignFileEntry,
  type DesignsGuestTheme
} from '../../../../../shared/designs/openpencil-host'
import {
  buildPanelDesignTokenCss,
  currentPanelColorScheme
} from '../../plugins/frames/plugin-panel-design-token-css'
import { usePluginPanelThemeRevision } from '../../plugins/frames/use-plugin-panel-theme-revision'
import { clearDesignOpenRequest, useDesignOpenRequest } from './design-open-request'

/** What the OpenPencil guest shows: a designs/ file, or OpenPencil's own home and storage. */
type OpenTarget = { root: string } & ({ kind: 'file'; name: string } | { kind: 'home' })

const FLUSH_TIMEOUT_MS = 3_000

function currentGuestTheme(): DesignsGuestTheme {
  return {
    colorScheme: currentPanelColorScheme(),
    tokens: buildPanelDesignTokenCss(DESIGNS_THEME_TOKENS)
  }
}

/** Asks the page to write its last edit and waits for it, so removing the page loses nothing. */
function flushGuest(element: Electron.WebviewTag | null): Promise<void> {
  return new Promise((resolve) => {
    if (!element) {
      resolve()
      return
    }
    const done = (): void => {
      clearTimeout(timer)
      element.removeEventListener('ipc-message', onMessage)
      resolve()
    }
    const onMessage = (event: Electron.IpcMessageEvent): void => {
      if (event.channel === DESIGNS_GUEST_MESSAGES.flushed) {
        done()
      }
    }
    const timer = setTimeout(done, FLUSH_TIMEOUT_MS)
    element.addEventListener('ipc-message', onMessage)
    try {
      element.send(DESIGNS_GUEST_MESSAGES.flush)
    } catch {
      // Not loaded yet, so it holds no edit.
      done()
    }
  })
}

function DesignsGuest({
  target,
  guestRef
}: {
  target: OpenTarget
  guestRef: React.RefObject<Electron.WebviewTag | null>
}): React.JSX.Element {
  const t = useTranslate()
  const themeRevision = usePluginPanelThemeRevision()
  const loadedRef = useRef(false)
  useEffect(() => {
    const element = guestRef.current
    if (!element) {
      return
    }
    // Main holds the page's first open until this binding lands, so the page never names a path.
    // Why dom-ready: getWebContentsId and send throw before it.
    const onReady = (): void => {
      loadedRef.current = true
      element.send(DESIGNS_GUEST_MESSAGES.theme, currentGuestTheme())
      void window.api.designs.bindGuest({
        guestId: element.getWebContentsId(),
        target: target.kind === 'file' ? { root: target.root, name: target.name } : null
      })
    }
    element.addEventListener('dom-ready', onReady)
    return () => {
      element.removeEventListener('dom-ready', onReady)
    }
  }, [guestRef, target])
  useEffect(() => {
    if (themeRevision > 0 && loadedRef.current) {
      guestRef.current?.send(DESIGNS_GUEST_MESSAGES.theme, currentGuestTheme())
    }
  }, [guestRef, themeRevision])
  return (
    <webview
      ref={guestRef}
      partition={OPENPENCIL_PARTITION}
      src={`${OPENPENCIL_START_URL}?forca=${target.kind}`}
      title={t('designs.panel.guestTitle', 'OpenPencil')}
      className="flex min-h-0 w-full flex-1 border-0 bg-sidebar"
    />
  )
}

function DesignsList({
  root,
  onOpen
}: {
  root: string
  onOpen: (target: OpenTarget) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [files, setFiles] = useState<DesignFileEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await window.api.designs.list({ root })
    if (result.ok) {
      setFiles(result.files)
      setError(null)
    } else {
      setFiles([])
      setError(t('designs.panel.listFailed', 'The designs folder could not be read.'))
    }
  }, [root, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = async (): Promise<void> => {
    const base = (draft ?? '').trim()
    const name = base.toLowerCase().endsWith(DESIGN_FILE_EXTENSION)
      ? base
      : `${base}${DESIGN_FILE_EXTENSION}`
    if (!isDesignFileName(name)) {
      setError(t('designs.panel.badName', 'Use a plain file name without slashes.'))
      return
    }
    const result = await window.api.designs.create({ root, name })
    if (!result.ok) {
      setError(
        result.reason === 'exists'
          ? t('designs.panel.exists', 'A design with this name already exists.')
          : t('designs.panel.createFailed', 'The design could not be created.')
      )
      return
    }
    setDraft(null)
    onOpen({ root, kind: 'file', name: result.name })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <span className="flex-1 truncate px-1 text-xs font-medium text-muted-foreground">
          {t('designs.panel.folder', 'designs/')}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('designs.panel.new', 'New design')}
          title={t('designs.panel.new', 'New design')}
          onClick={() => setDraft('')}
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('designs.panel.refresh', 'Refresh')}
          title={t('designs.panel.refresh', 'Refresh')}
          onClick={() => void refresh()}
        >
          <RefreshCw />
        </Button>
      </div>
      {draft !== null && (
        <form
          className="flex items-center gap-1 border-b border-border px-2 py-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <Input
            autoFocus
            value={draft}
            placeholder={t('designs.panel.namePlaceholder', 'name.fig')}
            aria-label={t('designs.panel.nameLabel', 'Design file name')}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setDraft(null)
              }
            }}
          />
          <Button type="submit" size="xs">
            {t('designs.panel.create', 'Create')}
          </Button>
        </form>
      )}
      {error && <p className="px-3 py-2 text-xs text-destructive">{error}</p>}
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto py-1">
        {files?.length === 0 && !error && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            {t('designs.panel.empty', 'No .fig files in designs/ yet.')}
          </p>
        )}
        {files?.map((file) => (
          <button
            key={file.name}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => onOpen({ root, kind: 'file', name: file.name })}
          >
            <FileImage className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{file.name}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="xs"
          className="w-full justify-start"
          onClick={() => onOpen({ root, kind: 'home' })}
        >
          <House />
          {t('designs.panel.home', 'OpenPencil home (its own storage)')}
        </Button>
      </div>
    </div>
  )
}

export default function DesignsPanel(): React.JSX.Element {
  const t = useTranslate()
  const worktree = useActiveWorktree()
  const repo = useRepoById(worktree?.repoId ?? null)
  const runtimeEnvironmentId = useAppStore((s) =>
    runtimeEnvironmentIdOrLocalUnlessTwin(s, worktree?.id)
  )
  const request = useDesignOpenRequest()
  const [target, setTarget] = useState<OpenTarget | null>(null)
  const guestRef = useRef<Electron.WebviewTag | null>(null)
  const worktreeId = worktree?.id ?? null
  const worktreePath = worktree?.path ?? null

  // Every way off the open page writes its last edit first.
  const navigate = useCallback(async (next: OpenTarget | null) => {
    await flushGuest(guestRef.current)
    setTarget(next)
  }, [])

  useEffect(() => {
    if (target && target.root !== worktreePath) {
      void navigate(null)
    }
  }, [navigate, target, worktreePath])

  useEffect(() => {
    if (request && request.worktreeId === worktreeId && worktreePath) {
      clearDesignOpenRequest(request)
      void navigate({ root: worktreePath, kind: 'file', name: request.name })
    }
  }, [navigate, request, worktreeId, worktreePath])

  // Kept on screen while it writes, even after the workspace changed under it.
  if (target) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('designs.panel.back', 'Back to designs')}
            title={t('designs.panel.back', 'Back to designs')}
            onClick={() => void navigate(null)}
          >
            <ArrowLeft />
          </Button>
          <span className="flex-1 truncate text-xs font-medium">
            {target.kind === 'file' ? target.name : t('designs.panel.homeTitle', 'OpenPencil home')}
          </span>
        </div>
        <DesignsGuest
          key={`${target.root}:${target.kind === 'file' ? `file:${target.name}` : 'home'}`}
          target={target}
          guestRef={guestRef}
        />
      </div>
    )
  }
  if (!worktree) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t('designs.panel.noWorkspace', 'Open a workspace to see its designs.')}
      </p>
    )
  }
  if (repo?.connectionId || runtimeEnvironmentId !== null) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t(
          'designs.panel.remote',
          'Designs works with workspaces on this computer. Remote and SSH workspaces are not supported yet.'
        )}
      </p>
    )
  }
  return <DesignsList root={worktree.path} onOpen={(next) => void navigate(next)} />
}
