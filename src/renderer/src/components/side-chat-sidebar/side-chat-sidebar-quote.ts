import { useLayoutEffect } from 'react'
import type { NativeChatSideChat } from '../native-chat/messages/actions/use-native-chat-side-chat'
import { formatNativeChatQuote } from '../../../../shared/native-chat/input/quotes/native-chat-quote-selection'
import { appendToNativeChatComposerDraft } from '../native-chat/drafts/native-chat-composer-draft-store'
import { structuredAgentSessionDraftScopeKey } from '../native-chat/drafts/native-chat-draft-scope'

// A chat opens one fork at a time, so one pending quote is enough.
let pendingQuote: string | null = null

export function setPendingSideChatQuote(text: string): void {
  pendingQuote = text
}

export function clearPendingSideChatQuote(): void {
  pendingQuote = null
}

/** Puts the quote waiting for this side chat into its composer. */
export function deliverPendingSideChatQuote(sideSessionId: string): void {
  const quote = pendingQuote
  pendingQuote = null
  if (quote) {
    appendToNativeChatComposerDraft(structuredAgentSessionDraftScopeKey(sideSessionId), {
      text: formatNativeChatQuote(quote)
    })
  }
}

/** Each chat tab's side chat, for its context menu, which is made before the side chat. */
const sideChatByTabId = new Map<string, NativeChatSideChat>()

export function useReportTabSideChat(
  tabId: string,
  sideChat: NativeChatSideChat | undefined
): void {
  useLayoutEffect(() => {
    if (!sideChat) {
      return
    }
    sideChatByTabId.set(tabId, sideChat)
    return () => {
      if (sideChatByTabId.get(tabId) === sideChat) {
        sideChatByTabId.delete(tabId)
      }
    }
  }, [sideChat, tabId])
}

export function sideChatOfTab(tabId: string): NativeChatSideChat | undefined {
  return sideChatByTabId.get(tabId)
}
