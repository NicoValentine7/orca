import React from 'react'
import { BookOpen, CalendarClock, Files, Search, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/index'
import { useShortcutKeyComboDetails } from '@/lib/keyboard/useShortcutLabel'
import { ShortcutKeyCombo } from '@/components/ui/ShortcutKeyCombo'
import { useMobileSidebarOnboardingBadge } from './mobile-sidebar-onboarding-badge'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu'
import { SidebarNavIconButton } from './SidebarNavIconButton'
import { SetupGuideSidebarEntry } from '../../setup-guide/SetupGuideSidebarEntry'
import { SidebarTaskNavButton } from './SidebarTaskNavButton'
import { HideSidebarMenu } from './sidebar-nav-controls'
import { useTranslate } from '@/i18n/use-translate'
import { lazyWithRetry } from '@/app-shell/startup/lazy-with-retry'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { useBotsEnabled } from '@/lib/bot-catalog'
import { selectAppRailVisible } from '../../app-rail/app-rail-layout'

export function shouldShowMobileButton(
  settings: Partial<Pick<GlobalSettings, 'showMobileButton'>> | null | undefined
): boolean {
  return settings?.showMobileButton !== false
}

export function shouldShowAutomationsButton(
  settings: Partial<Pick<GlobalSettings, 'showAutomationsButton'>> | null | undefined
): boolean {
  return settings?.showAutomationsButton !== false
}

export function shouldShowArtifactsButton(
  settings: Partial<Pick<GlobalSettings, 'showArtifactsButton'>> | null | undefined
): boolean {
  return settings?.showArtifactsButton === true
}

export function shouldShowSkillsButton(
  settings: Partial<Pick<GlobalSettings, 'showSkillsButton'>> | null | undefined
): boolean {
  return settings?.showSkillsButton === true
}

export function shouldShowAgentDashboardButton(
  settings: Partial<Pick<GlobalSettings, 'experimentalAgentDashboardPopout'>> | null | undefined
): boolean {
  return settings?.experimentalAgentDashboardPopout === true
}

const AgentDashboardSidebarEntry = lazyWithRetry(
  () => import('../../dashboard/sidebar/AgentDashboardSidebarEntry')
)

const SidebarNav = React.memo(function SidebarNav() {
  const t = useTranslate()
  const botsEnabled = useBotsEnabled()
  // Subscribe across this memo boundary; translate still handles pseudo-localization.
  useTranslation()
  const worktreePaletteShortcutCombos = useShortcutKeyComboDetails('worktree.palette')
  const openAutomationsPage = useAppStore((s) => s.openAutomationsPage)
  const openMobilePage = useAppStore((s) => s.openMobilePage)
  const openArtifactsPage = useAppStore((s) => s.openArtifactsPage)
  const openSkillsPage = useAppStore((s) => s.openSkillsPage)
  const openModal = useAppStore((s) => s.openModal)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const activeView = useAppStore((s) => s.activeView)
  const showAgentDashboardButton = useAppStore((s) => shouldShowAgentDashboardButton(s.settings))
  const showAutomationsButton = useAppStore((s) => shouldShowAutomationsButton(s.settings))
  const showMobileButton = useAppStore((s) => shouldShowMobileButton(s.settings))
  const showArtifactsButton = useAppStore((s) => shouldShowArtifactsButton(s.settings))
  const showSkillsButton = useAppStore((s) => shouldShowSkillsButton(s.settings))
  const automationsActive = activeView === 'automations'
  // With the experimental rail on, Tasks, Automations, Artifacts, Skills and Orca Mobile live on the rail instead.
  const appRailVisible = useAppStore(selectAppRailVisible)
  const mobileActive = activeView === 'mobile'
  const artifactsActive = activeView === 'artifacts'
  const skillsActive = activeView === 'skills'
  // The badge's paired-device lookup runs only while the list shows the Mobile row.
  const mobileOnboardingBadge = useMobileSidebarOnboardingBadge(showMobileButton && !appRailVisible)
  const hideAutomationsButton = React.useCallback(() => {
    void updateSettings({ showAutomationsButton: false })
  }, [updateSettings])
  const hideMobileButton = React.useCallback(() => {
    void updateSettings({ showMobileButton: false })
  }, [updateSettings])
  const hideArtifactsButton = React.useCallback(() => {
    void updateSettings({ showArtifactsButton: false })
  }, [updateSettings])
  const hideSkillsButton = React.useCallback(() => {
    void updateSettings({ showSkillsButton: false })
  }, [updateSettings])

  const searchLabel = t('auto.components.sidebar.SidebarNav.80611a8b10', 'Search')

  return (
    <div
      className="flex flex-col gap-0.5 px-2 pt-2 pb-1"
      data-contextual-tour-target="sidebar-navigation"
    >
      <div className="flex items-center gap-0.5">
        <SidebarNavIconButton
          icon={Search}
          label={searchLabel}
          onClick={() => openModal('worktree-palette')}
          aria-label={
            botsEnabled
              ? t('bots.palette.sidebarSearchLabel', 'Search bots, workspaces, and browser tabs')
              : t(
                  'auto.components.sidebar.SidebarNav.0c3395fd32',
                  'Search worktrees and browser tabs'
                )
          }
          tooltipExtra={worktreePaletteShortcutCombos.map((combo) => (
            <ShortcutKeyCombo
              key={combo.keys.join('-')}
              keys={combo.keys}
              doubleTap={combo.doubleTap}
              className="inline-flex gap-0.5"
            />
          ))}
        />
        {appRailVisible ? null : <SidebarTaskNavButton />}
        {showArtifactsButton && !appRailVisible ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <SidebarNavIconButton
                icon={Files}
                label={t('auto.components.sidebar.SidebarNav.artifacts', 'Artifacts')}
                active={artifactsActive}
                onClick={openArtifactsPage}
              />
            </ContextMenuTrigger>
            <HideSidebarMenu onHide={hideArtifactsButton} />
          </ContextMenu>
        ) : null}
        {showSkillsButton && !appRailVisible ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <SidebarNavIconButton
                icon={BookOpen}
                label={t('auto.components.sidebar.SidebarNav.skills', 'Skills')}
                active={skillsActive}
                onClick={openSkillsPage}
              />
            </ContextMenuTrigger>
            <HideSidebarMenu onHide={hideSkillsButton} />
          </ContextMenu>
        ) : null}
        {showAutomationsButton && !appRailVisible ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <SidebarNavIconButton
                icon={CalendarClock}
                label={t('auto.components.sidebar.SidebarNav.f323383e9a', 'Automations')}
                active={automationsActive}
                onClick={openAutomationsPage}
              />
            </ContextMenuTrigger>
            <HideSidebarMenu onHide={hideAutomationsButton} />
          </ContextMenu>
        ) : null}
        {showMobileButton && !appRailVisible ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <SidebarNavIconButton
                icon={Smartphone}
                label={t('auto.components.sidebar.SidebarNav.1b5c41caee', 'Orca Mobile')}
                active={mobileActive}
                badge={mobileOnboardingBadge.visible}
                tooltipExtra={
                  mobileOnboardingBadge.visible ? (
                    <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                      {t('auto.components.sidebar.SidebarNav.c86d83b5c3', 'New')}
                    </span>
                  ) : null
                }
                onClick={() => {
                  mobileOnboardingBadge.dismiss()
                  openMobilePage()
                }}
              />
            </ContextMenuTrigger>
            <HideSidebarMenu onHide={hideMobileButton} />
          </ContextMenu>
        ) : null}
      </div>
      <SetupGuideSidebarEntry />
      {showAgentDashboardButton ? (
        <React.Suspense fallback={null}>
          <AgentDashboardSidebarEntry />
        </React.Suspense>
      ) : null}
    </div>
  )
})

export default SidebarNav
