/**
 * Sidebar Component
 * Compact icon navigation for the desktop shell.
 */
import { NavLink } from 'react-router-dom';
import type { ComponentType } from 'react';
import {
  Bot,
  Clock,
  Cpu,
  MessageSquare,
  Network,
  Puzzle,
  Settings as SettingsIcon,
  Terminal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { rendererExtensionRegistry } from '@/extensions/registry';
import { hostApiFetch } from '@/lib/host-api';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import logoSvg from '@/assets/logo.png';

interface NavItemProps {
  to: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  testId?: string;
}

function NavItem({ to, icon: Icon, label, testId }: NavItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink to={to} data-testid={testId} aria-label={label}>
          {({ isActive }) => (
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-md text-foreground/60 transition-colors duration-150 hover:text-foreground',
                isActive &&
                  'border border-black/[0.06] bg-white text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-none'
              )}
            >
              <Icon className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.4 : 2} />
            </div>
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

const smallNavBase =
  'my-[3px] flex h-10 w-10 items-center justify-center rounded-[15px] text-foreground/60 transition-colors duration-150 hover:text-foreground';
const smallNavActive =
  'border border-black/[0.06] bg-white text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-none';

export function Sidebar() {
  const { t } = useTranslation(['common']);

  const openDevConsole = async () => {
    try {
      const result = await hostApiFetch<{
        success: boolean;
        url?: string;
        error?: string;
      }>('/api/gateway/control-ui');
      if (result.success && result.url) {
        window.electron.openExternal(result.url);
      } else {
        console.error('Failed to get Dev Console URL:', result.error);
      }
    } catch (err) {
      console.error('Error opening Dev Console:', err);
    }
  };

  const hiddenRoutes = rendererExtensionRegistry.getHiddenRoutes();
  const extraNavItems = rendererExtensionRegistry.getExtraNavItems();

  const coreNavItems = [
    { to: '/', icon: MessageSquare, label: t('sidebar.chat'), testId: 'sidebar-nav-chat' },
    { to: '/models', icon: Cpu, label: t('sidebar.models'), testId: 'sidebar-nav-models' },
    { to: '/agents', icon: Bot, label: t('sidebar.agents'), testId: 'sidebar-nav-agents' },
    { to: '/cron', icon: Clock, label: t('sidebar.cronTasks'), testId: 'sidebar-nav-cron' },
    { to: '/skills', icon: Puzzle, label: t('sidebar.skills'), testId: 'sidebar-nav-skills' },
    {
      to: '/channels',
      icon: Network,
      label: t('sidebar.channels'),
      testId: 'sidebar-nav-channels',
    },
  ];

  const navItems = [
    ...coreNavItems.filter((item) => !hiddenRoutes.has(item.to)),
    ...extraNavItems.map((item) => ({
      to: item.to,
      icon: item.icon,
      label: item.labelI18nKey ? t(item.labelI18nKey) : item.label,
      testId: item.testId,
    })),
  ];

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'relative isolate flex w-[72px] min-h-0 shrink-0 flex-col items-center overflow-hidden border-r px-2 py-4',
        'border-border bg-background text-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.4)]',
        'dark:border-border dark:bg-background dark:shadow-none'
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,247,247,0.98))] dark:bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(11,11,11,0.98))]"
      />

      <div className="mb-4 flex h-10 w-10 items-center justify-center">
        <img src={logoSvg} alt="PokeClaw" className="h-9 w-auto shrink-0" />
      </div>

      <nav className="flex flex-col items-center gap-1.5">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1.5 border-t border-black/[0.06] pt-3 dark:border-white/[0.07]">
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to="/settings"
              data-testid="sidebar-nav-settings"
              aria-label={t('sidebar.settings')}
              className={({ isActive }) => cn(smallNavBase, isActive && smallNavActive)}
            >
              <SettingsIcon className="h-[19px] w-[19px]" strokeWidth={2} />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{t('sidebar.settings')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-testid="sidebar-open-dev-console"
              aria-label={t('common:sidebar.openClawPage')}
              className={smallNavBase}
              onClick={openDevConsole}
            >
              <Terminal className="h-[19px] w-[19px]" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('common:sidebar.openClawPage')}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
