import { MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { NativeChatSideChat } from '../native-chat/messages/actions/use-native-chat-side-chat'
import { clearPendingSideChatQuote, setPendingSideChatQuote } from './side-chat-sidebar-quote'

/** Opens a side chat in the right sidebar with the selection quoted in its composer. */
export function SideChatQuoteMenuItem({
  sideChat,
  quoteText
}: {
  sideChat: NativeChatSideChat
  quoteText: string
}): React.JSX.Element {
  const t = useTranslate()
  const reason = sideChat.notReadyReason
  return (
    <DropdownMenuItem
      disabled={reason !== null}
      onSelect={() => {
        setPendingSideChatQuote(quoteText)
        void sideChat.open('').then((outcome) => {
          if ('refused' in outcome || !outcome.started) {
            clearPendingSideChatQuote()
          }
          if ('refused' in outcome) {
            toast.error(outcome.refused)
          }
        })
      }}
    >
      <MessageSquareText />
      <span className="grid min-w-0 flex-1">
        {t('components.sideChatSidebar.quoteInSideChat', 'Ask in side chat')}
        {reason ? (
          <span className="text-xs whitespace-normal text-muted-foreground contain-inline-size">
            {reason}
          </span>
        ) : null}
      </span>
    </DropdownMenuItem>
  )
}
