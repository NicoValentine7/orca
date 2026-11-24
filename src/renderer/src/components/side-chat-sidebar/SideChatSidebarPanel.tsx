import { Activity, useMemo } from 'react'
import { ChevronDown, PanelTopOpen, X } from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import {
  structuredAgentSessionOwnerForTab,
  structuredAgentSessionTargetForHost
} from '@/runtime/native-chat/session-ownership/structured-agent-session-owner'
import NativeChatView from '../native-chat/NativeChatView'
import { NativeChatComposerEditorOwner } from '../native-chat/composer/editor/native-chat-composer-editor-owner'
import { NativeChatHostOutageOwner } from '../native-chat/host-access/native-chat-host-outage-owner'
import { NativeChatPaneLifetime } from '../native-chat/pane/ownership/native-chat-pane-lifetime'
import { isStructuredTab } from '../../../../shared/agent-session/view/structured-agent-session-tab'
import type { Tab } from '../../../../shared/workspace-layout/tab-groups/tab-types'
import { selectSideChat, unregisterSideChat } from './side-chat-sidebar-registry'
import { useFocusedSideChats } from './use-focused-side-chats'

function tabName(tab: Tab): string {
  return tab.customLabel ?? tab.label
}

/** The focused chat's side chat, talked to here instead of in a pane. */
export default function SideChatSidebarPanel({
  isVisible
}: {
  isVisible: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const { sourceTab, sideTabs, selectedTab } = useFocusedSideChats()
  if (!sourceTab || !selectedTab) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        {t(
          'components.sideChatSidebar.empty',
          'Send /btw <question> in a chat to open a side chat here.'
        )}
      </div>
    )
  }
  const moveToTab = (): void => {
    unregisterSideChat(selectedTab.entityId)
    useAppStore.getState().activateTab(selectedTab.id, { worktreeId: selectedTab.worktreeId })
  }
  const close = (): void => {
    useAppStore.getState().closeUnifiedTab(selectedTab.id)
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
        {sideTabs.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" className="min-w-0 flex-1 justify-start">
                <span className="truncate">{tabName(selectedTab)}</span>
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {sideTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onSelect={() => selectSideChat(sourceTab.entityId, tab.entityId)}
                >
                  {tabName(tab)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="min-w-0 flex-1 truncate px-1 text-xs text-muted-foreground">
            {tabName(selectedTab)}
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={moveToTab}
              aria-label={t('components.sideChatSidebar.moveToTab', 'Open as tab')}
            >
              <PanelTopOpen />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t('components.sideChatSidebar.moveToTab', 'Open as tab')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={close}
              aria-label={t('components.sideChatSidebar.close', 'Close side chat')}
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t('components.sideChatSidebar.close', 'Close side chat')}
          </TooltipContent>
        </Tooltip>
      </div>
      <SideChatView key={selectedTab.id} tab={selectedTab} isVisible={isVisible} />
    </div>
  )
}

function SideChatView({
  tab,
  isVisible
}: {
  tab: Tab
  isVisible: boolean
}): React.JSX.Element | null {
  const owner = useAppStore((state) => structuredAgentSessionOwnerForTab(state, tab))
  const target = useMemo(() => structuredAgentSessionTargetForHost(owner), [owner])
  if (!target || !isStructuredTab(tab) || !tab.agentSessionAgent) {
    return null
  }
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <NativeChatPaneLifetime key={`${owner}:${tab.entityId}`} isVisible={isVisible}>
        <NativeChatHostOutageOwner target={target}>
          <NativeChatComposerEditorOwner>
            <Activity mode={isVisible ? 'visible' : 'hidden'}>
              <NativeChatView
                mode="structured"
                tabId={tab.id}
                groupId={tab.groupId}
                sessionId={tab.entityId}
                agent={tab.agentSessionAgent}
                isVisible={isVisible}
                isFocusedGroup={isVisible}
                target={target}
              />
            </Activity>
          </NativeChatComposerEditorOwner>
        </NativeChatHostOutageOwner>
      </NativeChatPaneLifetime>
    </div>
  )
}
