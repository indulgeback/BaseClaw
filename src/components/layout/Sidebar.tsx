/**
 * Sidebar Component
 * Navigation sidebar with menu items.
 * No longer fixed - sits inside the flex layout below the title bar.
 */
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Network,
  Bot,
  Puzzle,
  Clock,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Terminal,
  ExternalLink,
  Trash2,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { rendererExtensionRegistry } from '@/extensions/registry';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { hostApiFetch } from '@/lib/host-api';
import { useTranslation } from 'react-i18next';
import logoSvg from '@/assets/logo.svg';

type SessionBucketKey =
  | 'today'
  | 'yesterday'
  | 'withinWeek'
  | 'withinTwoWeeks'
  | 'withinMonth'
  | 'older';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  collapsed?: boolean;
  onClick?: () => void;
  testId?: string;
}

function NavItem({ to, icon, label, badge, collapsed, onClick, testId }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      data-testid={testId}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-10 items-center gap-2.5 rounded-[14px] px-3 py-2 text-[14px] font-medium transition-all duration-200',
          'text-foreground/70 hover:bg-accent hover:text-foreground hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]',
          'dark:text-foreground/70 dark:hover:bg-accent dark:hover:shadow-none',
          isActive
            ? 'bg-card text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] dark:bg-card dark:shadow-none dark:ring-white/[0.06]'
            : '',
          collapsed && 'justify-center px-0'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
              collapsed && 'left-1'
            )}
          />
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200',
              isActive
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground group-hover:bg-accent group-hover:text-foreground',
            )}
          >
            {icon}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap tracking-[-0.01em]">{label}</span>
              {badge && (
                <Badge variant="secondary" className="ml-auto shrink-0 rounded-full bg-accent text-[10px]">
                  {badge}
                </Badge>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}

function getSessionBucket(activityMs: number, nowMs: number): SessionBucketKey {
  if (!activityMs || activityMs <= 0) return 'older';

  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  if (activityMs >= startOfToday) return 'today';
  if (activityMs >= startOfYesterday) return 'yesterday';

  const daysAgo = (startOfToday - activityMs) / (24 * 60 * 60 * 1000);
  if (daysAgo <= 7) return 'withinWeek';
  if (daysAgo <= 14) return 'withinTwoWeeks';
  if (daysAgo <= 30) return 'withinMonth';
  return 'older';
}

const INITIAL_NOW_MS = Date.now();

function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const [, agentId] = sessionKey.split(':');
  return agentId || 'main';
}

export function Sidebar() {
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);

  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
  const switchSession = useChatStore((s) => s.switchSession);
  const newSession = useChatStore((s) => s.newSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const loadHistory = useChatStore((s) => s.loadHistory);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';
  const isGatewayReady = isGatewayRunning && gatewayStatus.gatewayReady !== false;

  useEffect(() => {
    if (!isGatewayReady) return;
    let cancelled = false;
    const hasExistingMessages = useChatStore.getState().messages.length > 0;
    (async () => {
      await loadSessions();
      if (cancelled) return;
      await loadHistory(hasExistingMessages);
    })();
    return () => {
      cancelled = true;
    };
  }, [isGatewayReady, loadHistory, loadSessions]);
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const navigate = useNavigate();
  const isOnChat = useLocation().pathname === '/';

  const getSessionLabel = (key: string, displayName?: string, label?: string) =>
    sessionLabels[key] ?? label ?? displayName ?? key;

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

  const { t } = useTranslation(['common', 'chat']);
  const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);
  const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const agentNameById = useMemo(
    () => Object.fromEntries((agents ?? []).map((agent) => [agent.id, agent.name])),
    [agents],
  );
  const sessionBuckets: Array<{ key: SessionBucketKey; label: string; sessions: typeof sessions }> = [
    { key: 'today', label: t('chat:historyBuckets.today'), sessions: [] },
    { key: 'yesterday', label: t('chat:historyBuckets.yesterday'), sessions: [] },
    { key: 'withinWeek', label: t('chat:historyBuckets.withinWeek'), sessions: [] },
    { key: 'withinTwoWeeks', label: t('chat:historyBuckets.withinTwoWeeks'), sessions: [] },
    { key: 'withinMonth', label: t('chat:historyBuckets.withinMonth'), sessions: [] },
    { key: 'older', label: t('chat:historyBuckets.older'), sessions: [] },
  ];
  const sessionBucketMap = Object.fromEntries(sessionBuckets.map((bucket) => [bucket.key, bucket])) as Record<
    SessionBucketKey,
    (typeof sessionBuckets)[number]
  >;

  for (const session of [...sessions].sort((a, b) =>
    (sessionLastActivity[b.key] ?? 0) - (sessionLastActivity[a.key] ?? 0)
  )) {
    const bucketKey = getSessionBucket(sessionLastActivity[session.key] ?? 0, nowMs);
    sessionBucketMap[bucketKey].sessions.push(session);
  }

  const hiddenRoutes = rendererExtensionRegistry.getHiddenRoutes();
  const extraNavItems = rendererExtensionRegistry.getExtraNavItems();

  const coreNavItems = [
    { to: '/models', icon: <Cpu className="h-[18px] w-[18px]" strokeWidth={2} />, label: t('sidebar.models'), testId: 'sidebar-nav-models' },
    { to: '/agents', icon: <Bot className="h-[18px] w-[18px]" strokeWidth={2} />, label: t('sidebar.agents'), testId: 'sidebar-nav-agents' },
    { to: '/channels', icon: <Network className="h-[18px] w-[18px]" strokeWidth={2} />, label: t('sidebar.channels'), testId: 'sidebar-nav-channels' },
    { to: '/skills', icon: <Puzzle className="h-[18px] w-[18px]" strokeWidth={2} />, label: t('sidebar.skills'), testId: 'sidebar-nav-skills' },
    { to: '/cron', icon: <Clock className="h-[18px] w-[18px]" strokeWidth={2} />, label: t('sidebar.cronTasks'), testId: 'sidebar-nav-cron' },
  ];

  const navItems = [
    ...coreNavItems.filter((item) => !hiddenRoutes.has(item.to)),
    ...extraNavItems.map((item) => ({
      to: item.to,
      icon: <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />,
      label: item.labelI18nKey ? t(item.labelI18nKey) : item.label,
      testId: item.testId,
    })),
  ];

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'relative isolate flex min-h-0 shrink-0 flex-col overflow-hidden border-r transition-[width] duration-300 ease-out',
        'border-border bg-background text-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.4)]',
        'dark:border-border dark:bg-background dark:shadow-none',
        sidebarCollapsed ? 'w-[68px]' : 'w-[268px]'
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_0%,rgba(255,255,255,0.88),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,247,247,0.98))] dark:bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.04),transparent_30%),linear-gradient(180deg,rgba(18,18,18,0.98),rgba(11,11,11,0.98))]"
      />
      {/* Top Header Toggle */}
      <div className={cn("flex h-16 items-center px-3", sidebarCollapsed ? "justify-center" : "justify-between")}>
        {!sidebarCollapsed && (
          <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-card shadow-[0_10px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] dark:shadow-none dark:ring-white/[0.08]">
              <img src={logoSvg} alt="PokeClaw" className="h-5 w-auto shrink-0" />
            </div>
            <div className="min-w-0">
              <span className="block truncate whitespace-nowrap text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                PokeClaw
              </span>
              <span className="block truncate text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/45">
                Desktop
              </span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'h-9 w-9 shrink-0 rounded-[12px] text-muted-foreground transition-all duration-200',
            'hover:bg-accent hover:text-foreground hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]',
            'dark:hover:bg-accent dark:hover:shadow-none',
          )}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3">
        <button
          data-testid="sidebar-new-chat"
          onClick={() => {
            const { messages } = useChatStore.getState();
            if (messages.length > 0) newSession();
            navigate('/');
          }}
          className={cn(
            'group mb-2 flex min-h-11 w-full items-center gap-2.5 rounded-[16px] px-3 py-2 text-[14px] font-semibold transition-all duration-200',
            'border border-black/10 bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 hover:bg-primary/92',
            'dark:border-white/[0.08] dark:bg-primary dark:text-primary-foreground dark:shadow-none dark:hover:bg-primary/92',
            sidebarCollapsed && 'justify-center px-0',
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-white/12 text-primary-foreground dark:bg-white/[0.08] dark:text-primary-foreground">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          {!sidebarCollapsed && <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left tracking-[-0.01em]">{t('sidebar.newChat')}</span>}
        </button>

        {navItems.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Session list — below Settings, only when expanded */}
      {!sidebarCollapsed && sessions.length > 0 && (
        <div className="sidebar-scrollbar mt-4 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
          {sessionBuckets.map((bucket) => (
            bucket.sessions.length > 0 ? (
              <div key={bucket.key} className="pt-2">
                <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/38">
                  {bucket.label}
                </div>
                {bucket.sessions.map((s) => {
                  const agentId = getAgentIdFromSessionKey(s.key);
                  const agentName = agentNameById[agentId] || agentId;
                  return (
                    <div key={s.key} className="group relative flex items-center">
                      <button
                        onClick={() => { switchSession(s.key); navigate('/'); }}
                        className={cn(
                          'w-full rounded-[14px] px-3 py-2 pr-8 text-left text-[13px] transition-all duration-200',
                          'hover:bg-accent hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] dark:hover:bg-accent dark:hover:shadow-none',
                          isOnChat && currentSessionKey === s.key
                            ? 'bg-card font-medium text-foreground shadow-[0_8px_20px_rgba(0,0,0,0.07)] dark:bg-card dark:shadow-none'
                            : 'text-foreground/70',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
                            {agentName}
                          </span>
                          <span className="truncate">{getSessionLabel(s.key, s.displayName, s.label)}</span>
                        </div>
                      </button>
                      <button
                        aria-label="Delete session"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete({
                            key: s.key,
                            label: getSessionLabel(s.key, s.displayName, s.label),
                          });
                        }}
                        className={cn(
                          'absolute right-1.5 flex items-center justify-center rounded-lg p-1 transition-opacity',
                          'opacity-0 group-hover:opacity-100',
                          'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-black/[0.06] p-3 dark:border-white/[0.07]">
        <NavLink
            to="/settings"
            data-testid="sidebar-nav-settings"
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-10 items-center gap-2.5 rounded-[14px] px-3 py-2 text-[14px] font-medium transition-all duration-200',
                'text-foreground/70 hover:bg-accent hover:text-foreground hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]',
                'dark:text-foreground/70 dark:hover:bg-accent dark:hover:shadow-none',
                isActive && 'bg-card text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] dark:bg-card dark:shadow-none dark:ring-white/[0.06]',
                sidebarCollapsed ? 'justify-center px-0' : ''
              )
            }
          >
          {({ isActive }) => (
            <>
              <span
                className={cn(
              'absolute left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-foreground transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                )}
              />
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200',
                isActive
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted-foreground group-hover:bg-accent group-hover:text-foreground'
              )}>
                <SettingsIcon className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
              {!sidebarCollapsed && <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap tracking-[-0.01em]">{t('sidebar.settings')}</span>}
            </>
          )}
        </NavLink>

        <Button
          data-testid="sidebar-open-dev-console"
          variant="ghost"
          className={cn(
            'group mt-1 flex h-auto w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-[14px] font-medium transition-all duration-200',
            'text-foreground/62 hover:bg-accent hover:text-foreground hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]',
            'dark:hover:bg-accent dark:hover:shadow-none',
            sidebarCollapsed ? 'justify-center px-0' : 'justify-start'
          )}
          onClick={openDevConsole}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
            <Terminal className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap">{t('common:sidebar.openClawPage')}</span>
              <ExternalLink className="h-3 w-3 shrink-0 ml-auto opacity-50 text-muted-foreground" />
            </>
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={!!sessionToDelete}
        title={t('common:actions.confirm')}
        message={t('common:sidebar.deleteSessionConfirm', { label: sessionToDelete?.label })}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (!sessionToDelete) return;
          await deleteSession(sessionToDelete.key);
          if (currentSessionKey === sessionToDelete.key) navigate('/');
          setSessionToDelete(null);
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </aside>
  );
}
