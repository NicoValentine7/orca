import React from 'react'
import { EyeOff, Github, Gitlab, List } from 'lucide-react'
import { JiraIcon } from '@/components/icons/JiraIcon'
import { LinearIcon } from '@/components/icons/LinearIcon'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { PER_REPO_FETCH_LIMIT } from '../../../../../shared/work-items/work-item-pagination'
import { getLocalPreflightContext } from '@/runtime/hosts/preflight/local-preflight-context'
import { SidebarNavIconButton } from './SidebarNavIconButton'
import { useAppStore } from '@/store/index'
import { useRepoMap } from '@/store/repos/use-repository-catalog'
import { useTranslate } from '@/i18n/use-translate'
import { isGitRepoKind } from '../../../../../shared/repository/repo-kind'
import { getTaskPresetQuery } from '../../../../../shared/work-items/task-preset-query'
import {
  normalizeVisibleTaskProviders,
  restoreAvailableDefaultTaskProvider,
  resolveVisibleTaskProvider
} from '../../../../../shared/work-items/task-providers'
import { localPreflightContextKey } from '../../../runtime/hosts/preflight/local-preflight-context-key'

type TaskProviderEntry = { label: string; icon: React.ReactNode; onOpen: () => void }

function TaskSidebarMenu({
  providers,
  onHide
}: {
  providers: TaskProviderEntry[]
  onHide: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <ContextMenuContent>
      {providers.map((p) => (
        <ContextMenuItem key={p.label} onSelect={p.onOpen}>
          {p.icon}
          {p.label}
        </ContextMenuItem>
      ))}
      {providers.length > 0 ? <ContextMenuSeparator /> : null}
      <ContextMenuItem onSelect={onHide}>
        <EyeOff className="size-3.5" />
        {t('auto.components.sidebar.SidebarNav.d599269755', 'Hide from sidebar')}
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

export function SidebarTaskNavButton(): React.JSX.Element | null {
  const t = useTranslate()
  const openTaskPage = useAppStore((s) => s.openTaskPage)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const activeView = useAppStore((s) => s.activeView)
  const repos = useAppStore((s) => s.repos)
  const repoMap = useRepoMap()
  const showTasksButton = useAppStore((s) => s.settings?.showTasksButton !== false)
  const rawVisibleTaskProviders = useAppStore((s) => s.settings?.visibleTaskProviders)
  const defaultTaskSource = useAppStore((s) => s.settings?.defaultTaskSource ?? 'github')
  const preflightStatus = useAppStore((s) => s.preflightStatus)
  const preflightStatusChecked = useAppStore((s) => s.preflightStatusChecked)
  const preflightStatusContextKey = useAppStore((s) => s.preflightStatusContextKey)
  const refreshPreflightStatus = useAppStore((s) => s.refreshPreflightStatus)
  const expectedPreflightContextKey = useAppStore((s) =>
    localPreflightContextKey(getLocalPreflightContext(s))
  )
  const linearStatus = useAppStore((s) => s.linearStatus)
  const linearStatusChecked = useAppStore((s) => s.linearStatusChecked)
  const checkLinearConnection = useAppStore((s) => s.checkLinearConnection)
  const prefetchWorkItems = useAppStore((s) => s.prefetchWorkItems)
  const activeRepoId = useAppStore((s) => s.activeRepoId)
  const defaultTaskViewPreset = useAppStore((s) => s.settings?.defaultTaskViewPreset ?? 'all')
  const preferredVisibleTaskProviders = React.useMemo(
    () => normalizeVisibleTaskProviders(rawVisibleTaskProviders),
    [rawVisibleTaskProviders]
  )
  const preflightStatusCurrent = preflightStatusContextKey === expectedPreflightContextKey
  const visibleTaskProviders = React.useMemo(
    () =>
      restoreAvailableDefaultTaskProvider(
        preferredVisibleTaskProviders,
        {
          gitlabInstalled: preflightStatusCurrent && preflightStatus?.glab?.installed === true,
          linearConnected: linearStatus.connected === true
        },
        defaultTaskSource
      ),
    [
      defaultTaskSource,
      linearStatus.connected,
      preferredVisibleTaskProviders,
      preflightStatusCurrent,
      preflightStatus?.glab?.installed
    ]
  )
  const resolvedDefaultTaskSource = React.useMemo(
    () => resolveVisibleTaskProvider(defaultTaskSource, visibleTaskProviders),
    [defaultTaskSource, visibleTaskProviders]
  )

  React.useEffect(() => {
    if (!preflightStatusChecked || !preflightStatusCurrent) {
      void refreshPreflightStatus()
    }
    if (!linearStatusChecked) {
      void checkLinearConnection()
    }
  }, [
    checkLinearConnection,
    linearStatusChecked,
    preflightStatusChecked,
    preflightStatusCurrent,
    refreshPreflightStatus
  ])

  const handlePrefetch = React.useCallback(() => {
    if (resolvedDefaultTaskSource !== 'github') {
      return
    }
    const activeRepo = activeRepoId ? (repoMap.get(activeRepoId) ?? null) : null
    const activeGitRepo = activeRepo && isGitRepoKind(activeRepo) ? activeRepo : null
    const firstGitRepo = activeGitRepo ?? repos.find((r) => isGitRepoKind(r))
    if (firstGitRepo?.path) {
      prefetchWorkItems(
        firstGitRepo.id,
        firstGitRepo.path,
        PER_REPO_FETCH_LIMIT,
        getTaskPresetQuery(defaultTaskViewPreset)
      )
    }
  }, [
    activeRepoId,
    defaultTaskViewPreset,
    prefetchWorkItems,
    repoMap,
    repos,
    resolvedDefaultTaskSource
  ])

  const hideTasksButton = React.useCallback(() => {
    void updateSettings({ showTasksButton: false })
  }, [updateSettings])

  if (!showTasksButton) {
    return null
  }

  const tasksActive = activeView === 'tasks'
  const providerEntries: Record<string, TaskProviderEntry> = {
    github: {
      label: t('auto.components.sidebar.SidebarNav.0ccba862b8', 'Open GitHub tasks'),
      icon: <Github className="size-3.5" aria-hidden />,
      onOpen: () => openTaskPage({ taskSource: 'github' })
    },
    gitlab: {
      label: t('auto.components.sidebar.SidebarNav.196c1b5362', 'Open GitLab tasks'),
      icon: <Gitlab className="size-3.5" aria-hidden />,
      onOpen: () => openTaskPage({ taskSource: 'gitlab' })
    },
    linear: {
      label: t('auto.components.sidebar.SidebarNav.c39ab10000', 'Open Linear tasks'),
      icon: <LinearIcon className="size-3.5" />,
      onOpen: () => openTaskPage({ taskSource: 'linear' })
    },
    jira: {
      label: t('auto.components.sidebar.SidebarNav.e7ad3c540d', 'Open Jira tasks'),
      icon: <JiraIcon className="size-3.5" />,
      onOpen: () => openTaskPage({ taskSource: 'jira' })
    }
  }
  const providers = (['github', 'gitlab', 'linear', 'jira'] as const)
    .filter((id) => visibleTaskProviders.includes(id))
    .map((id) => providerEntries[id])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <SidebarNavIconButton
          icon={List}
          label={t('auto.components.sidebar.SidebarNav.fee535205b', 'Tasks')}
          active={tasksActive}
          onClick={() => openTaskPage()}
          onPointerEnter={handlePrefetch}
          onFocus={handlePrefetch}
          data-contextual-tour-target="sidebar-tasks"
        />
      </ContextMenuTrigger>
      <TaskSidebarMenu providers={providers} onHide={hideTasksButton} />
    </ContextMenu>
  )
}
