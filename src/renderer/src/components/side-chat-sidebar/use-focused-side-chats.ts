import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { selectFocusedChatTab } from '@/lib/focused-chat-workers'
import type { Tab } from '../../../../shared/workspace-layout/tab-groups/tab-types'
import { sideChatSessionIdsOf, useSideChatRegistry } from './side-chat-sidebar-registry'

const NO_TABS: readonly Tab[] = []

export type FocusedSideChats = {
  sourceTab: Tab | null
  /** Newest first; only side chats whose tab exists in the source's workspace. */
  sideTabs: readonly Tab[]
  selectedTab: Tab | null
}

/** The side chats of the chat in the workspace's focused pane. */
export function useFocusedSideChats(): FocusedSideChats {
  const sourceTab = useAppStore((state) => selectFocusedChatTab(state, state.activeWorktreeId))
  const worktreeTabs = useAppStore(
    useShallow((state) =>
      sourceTab ? (state.unifiedTabsByWorktree[sourceTab.worktreeId] ?? NO_TABS) : NO_TABS
    )
  )
  const entries = useSideChatRegistry((state) => state.entries)
  const selectedSessionId = useSideChatRegistry((state) =>
    sourceTab ? state.selectedBySource[sourceTab.entityId] : undefined
  )
  return useMemo(() => {
    if (!sourceTab) {
      return { sourceTab: null, sideTabs: NO_TABS, selectedTab: null }
    }
    const sideTabs = sideChatSessionIdsOf(entries, sourceTab.entityId)
      .map((sessionId) =>
        worktreeTabs.find(
          (tab) => tab.contentType === 'agent-session' && tab.entityId === sessionId
        )
      )
      .filter((tab): tab is Tab => tab !== undefined)
    const selectedTab =
      sideTabs.find((tab) => tab.entityId === selectedSessionId) ?? sideTabs[0] ?? null
    return { sourceTab, sideTabs, selectedTab }
  }, [entries, selectedSessionId, sourceTab, worktreeTabs])
}
