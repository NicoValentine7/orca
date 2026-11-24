import { create } from 'zustand'
import { useAppStore } from '@/store'
import type { AppState } from '@/store/types'
import type { Tab } from '../../../../shared/workspace-layout/tab-groups/tab-types'

/** A `/btw` fork shown in the right sidebar instead of the tab strip. */
export type SideChatEntry = { sideSessionId: string; sourceSessionId: string; createdAt: number }

type SideChatRegistryState = {
  entries: readonly SideChatEntry[]
  /** The side chat each source shows; falls back to its newest. */
  selectedBySource: Readonly<Record<string, string>>
}

const STORAGE_KEY = 'orca.sideChatSidebar.entries'

function readEntries(): SideChatEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is SideChatEntry =>
            typeof entry?.sideSessionId === 'string' &&
            typeof entry?.sourceSessionId === 'string' &&
            typeof entry?.createdAt === 'number'
        )
      : []
  } catch {
    return []
  }
}

function writeEntries(entries: readonly SideChatEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Unwritable storage only loses the sidebar placement across restarts.
  }
}

export const useSideChatRegistry = create<SideChatRegistryState>(() => ({
  entries: typeof window === 'undefined' ? [] : readEntries(),
  selectedBySource: {}
}))

function setEntries(entries: readonly SideChatEntry[]): void {
  useSideChatRegistry.setState({ entries })
  writeEntries(entries)
}

export function registerSideChat(sourceSessionId: string, sideSessionId: string): void {
  const { entries, selectedBySource } = useSideChatRegistry.getState()
  setEntries([
    ...entries.filter((entry) => entry.sideSessionId !== sideSessionId),
    { sideSessionId, sourceSessionId, createdAt: Date.now() }
  ])
  useSideChatRegistry.setState({
    selectedBySource: { ...selectedBySource, [sourceSessionId]: sideSessionId }
  })
}

export function unregisterSideChat(sideSessionId: string): void {
  const { entries } = useSideChatRegistry.getState()
  if (entries.some((entry) => entry.sideSessionId === sideSessionId)) {
    setEntries(entries.filter((entry) => entry.sideSessionId !== sideSessionId))
  }
}

export function selectSideChat(sourceSessionId: string, sideSessionId: string): void {
  const { selectedBySource } = useSideChatRegistry.getState()
  useSideChatRegistry.setState({
    selectedBySource: { ...selectedBySource, [sourceSessionId]: sideSessionId }
  })
}

export function sideChatSessionIdsOf(
  entries: readonly SideChatEntry[],
  sourceSessionId: string
): string[] {
  return entries
    .filter((entry) => entry.sourceSessionId === sourceSessionId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((entry) => entry.sideSessionId)
}

export function isSideChatTab(entries: readonly SideChatEntry[], tab: Tab | undefined): boolean {
  return (
    tab?.contentType === 'agent-session' &&
    entries.some((entry) => entry.sideSessionId === tab.entityId)
  )
}

export function openSideChatInRightSidebar(sourceSessionId: string, sideSessionId: string): void {
  selectSideChat(sourceSessionId, sideSessionId)
  const app = useAppStore.getState()
  app.setRightSidebarOpen(true)
  app.setRightSidebarTab('side-chat')
  // A transcript plus composer needs more than the default sidebar width.
  if (app.rightSidebarWidth < SIDE_CHAT_MIN_WIDTH) {
    app.setRightSidebarWidth(SIDE_CHAT_MIN_WIDTH)
  }
}

const SIDE_CHAT_MIN_WIDTH = 420

/** Side chats whose tab was seen this run; a restored tab that is gone again ends its entry. */
const seenSideSessionIds = new Set<string>()

function syncWithTabs(state: AppState): void {
  const { entries } = useSideChatRegistry.getState()
  if (entries.length === 0) {
    return
  }
  const live = new Set<string>()
  for (const tabs of Object.values(state.unifiedTabsByWorktree)) {
    for (const tab of tabs) {
      if (tab.contentType === 'agent-session') {
        live.add(tab.entityId)
      }
    }
  }
  const gone = entries.filter(
    (entry) => seenSideSessionIds.has(entry.sideSessionId) && !live.has(entry.sideSessionId)
  )
  for (const entry of entries) {
    if (live.has(entry.sideSessionId)) {
      seenSideSessionIds.add(entry.sideSessionId)
    }
  }
  if (gone.length > 0) {
    for (const entry of gone) {
      seenSideSessionIds.delete(entry.sideSessionId)
    }
    setEntries(entries.filter((entry) => !gone.includes(entry)))
  }
  redirectSelectedSideChats(state, entries)
}

const lastActiveTabByGroup = new Map<string, string | null>()
let redirecting = false

/** A side chat newly selected in a pane (tab cycling, a host frame) moves back to the sidebar. */
function redirectSelectedSideChats(state: AppState, entries: readonly SideChatEntry[]): void {
  if (!state.activeWorktreeId || redirecting) {
    return
  }
  const worktreeId = state.activeWorktreeId
  const tabs = state.unifiedTabsByWorktree[worktreeId] ?? []
  for (const group of state.groupsByWorktree[worktreeId] ?? []) {
    const previous = lastActiveTabByGroup.get(group.id)
    lastActiveTabByGroup.set(group.id, group.activeTabId ?? null)
    if (previous === group.activeTabId) {
      continue
    }
    const active = tabs.find((tab) => tab.id === group.activeTabId)
    const entry = active
      ? entries.find((candidate) => candidate.sideSessionId === active.entityId)
      : undefined
    if (!active || active.contentType !== 'agent-session' || !entry) {
      continue
    }
    const source = tabs.find(
      (tab) => tab.contentType === 'agent-session' && tab.entityId === entry.sourceSessionId
    )
    redirecting = true
    try {
      if (source) {
        state.activateTab(source.id, { worktreeId })
      }
      openSideChatInRightSidebar(entry.sourceSessionId, entry.sideSessionId)
    } finally {
      redirecting = false
    }
    return
  }
}

if (typeof window !== 'undefined') {
  useAppStore.subscribe(syncWithTabs)
}
