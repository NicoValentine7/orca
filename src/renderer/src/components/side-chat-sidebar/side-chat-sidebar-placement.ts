import { useAppStore } from '@/store'
import { findStructuredLaunchTab } from '@/lib/agent-session/launch/structured-agent-session-launch-surface'
import { requestNativeChatComposerFocus } from '../native-chat/composer/focus/native-chat-composer-focus-intent'
import type { NativeChatSideChatPlacement } from '../native-chat/messages/actions/native-chat-side-chat-placement'
import type { ExecutionHostId } from '../../../../shared/execution-host/execution-host'
import { openSideChatInRightSidebar, registerSideChat } from './side-chat-sidebar-registry'
import { clearPendingSideChatQuote, deliverPendingSideChatQuote } from './side-chat-sidebar-quote'

// Remote hosts publish the fork's tab in a later frame.
const SIDE_CHAT_TAB_WATCH_MS = 60_000

/** `/btw`: the fork opens in the right sidebar beside its source, never as a pane of its own. */
export function beginSideChatSidebarPlacement(
  worktreeId: string,
  sourceTabId: string
): NativeChatSideChatPlacement {
  const sourceSessionId = useAppStore
    .getState()
    .unifiedTabsByWorktree[worktreeId]?.find((tab) => tab.id === sourceTabId)?.entityId
  return {
    settle: (chat) => {
      if (!chat || !sourceSessionId) {
        clearPendingSideChatQuote()
        return
      }
      deliverPendingSideChatQuote(chat.sessionId)
      // Registered first so the tab never flashes in the strip once drawn.
      registerSideChat(sourceSessionId, chat.sessionId)
      openSideChatInRightSidebar(sourceSessionId, chat.sessionId)
      focusWhenDrawn({ worktreeId, ...chat })
    }
  }
}

function focusWhenDrawn(chat: {
  worktreeId: string
  sessionId: string
  executionHostId: ExecutionHostId
}): void {
  const focus = (): boolean => {
    const tab = findStructuredLaunchTab(chat)
    if (tab) {
      requestNativeChatComposerFocus(tab.id)
    }
    return tab !== null
  }
  if (focus()) {
    return
  }
  const unsubscribe = useAppStore.subscribe(() => {
    if (focus()) {
      stop()
    }
  })
  const expiry = setTimeout(() => stop(), SIDE_CHAT_TAB_WATCH_MS)
  const stop = (): void => {
    unsubscribe()
    clearTimeout(expiry)
  }
}
