import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Compass, MessageCirclePlus, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import type { ChatSession } from '@/stores/chat/types';
import type { AgentSummary } from '@/types/agent';
import { cn } from '@/lib/utils';

interface ConversationListPaneProps {
  width: number;
}

interface AgentSessionGroup {
  agentId: string;
  agentName: string;
  isDefault: boolean;
  sessions: ChatSession[];
}

const CUSTOM_PARTNER_PROMPT = [
  'I want to create a custom AI partner in PokeClaw.',
  '',
  'Please do not create the agent yet. First interview me so we can design it well. Ask focused follow-up questions about the partner name, role/domain, target users, personality and tone, typical tasks, workflows, boundaries, tools or skills it should use, memory/context it should keep, and preferred output formats.',
  '',
  'Start with the most important questions first, and guide me step by step toward a clear custom agent specification.',
].join('\n');

function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const [, agentId] = sessionKey.split(':');
  return agentId || 'main';
}

function getAgentInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'A';
  return trimmed.slice(0, 1).toUpperCase();
}

function buildAgentSessionGroups(
  agents: AgentSummary[],
  sessions: ChatSession[],
  sessionLastActivity: Record<string, number>,
): AgentSessionGroup[] {
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const groups = new Map<string, AgentSessionGroup>();

  const ensureGroup = (agentId: string) => {
    const agent = agentById.get(agentId);
    const existing = groups.get(agentId);
    if (existing) return existing;
    const group: AgentSessionGroup = {
      agentId,
      agentName: agent?.name || agentId,
      isDefault: agent?.isDefault || agentId === 'main',
      sessions: [],
    };
    groups.set(agentId, group);
    return group;
  };

  for (const agent of agents) {
    ensureGroup(agent.id);
  }

  for (const session of sessions) {
    ensureGroup(getAgentIdFromSessionKey(session.key)).sessions.push(session);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sessions: [...group.sessions].sort((a, b) =>
        (sessionLastActivity[b.key] ?? b.updatedAt ?? 0) - (sessionLastActivity[a.key] ?? a.updatedAt ?? 0)
      ),
    }))
    .filter((group) => group.sessions.length > 0 || group.isDefault)
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      const latestA = Math.max(0, ...a.sessions.map((session) => sessionLastActivity[session.key] ?? session.updatedAt ?? 0));
      const latestB = Math.max(0, ...b.sessions.map((session) => sessionLastActivity[session.key] ?? session.updatedAt ?? 0));
      if (latestA !== latestB) return latestB - latestA;
      return a.agentName.localeCompare(b.agentName);
    });
}

interface ConversationSessionRowProps {
  sessionKey: string;
  label: string;
  agentName: string;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationSessionRow({ sessionKey, label, agentName, active, onSelect, onDelete }: ConversationSessionRowProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const openTooltipIfTruncated = () => {
    const labelElement = labelRef.current;
    if (!labelElement) return;
    setTooltipOpen(labelElement.scrollWidth > labelElement.clientWidth);
  };

  return (
    <div className="group/row relative">
      <Tooltip open={tooltipOpen} onOpenChange={(open) => { if (!open) setTooltipOpen(false); }}>
        <TooltipTrigger asChild>
          <button
            data-testid={`conversation-session-${sessionKey}`}
            onClick={onSelect}
            onPointerEnter={openTooltipIfTruncated}
            onPointerLeave={() => setTooltipOpen(false)}
            onFocus={openTooltipIfTruncated}
            onBlur={() => setTooltipOpen(false)}
            className={cn(
              'flex min-h-10 w-full min-w-0 items-center rounded-[14px] py-2 pl-3 pr-9 text-left text-[13px] transition-all duration-200',
              active
                ? 'bg-background text-foreground shadow-sm ring-1 ring-black/[0.05] dark:bg-white/[0.06] dark:ring-white/[0.07]'
                : 'text-foreground/66 hover:bg-background/70 hover:text-foreground dark:hover:bg-white/[0.05]',
            )}
          >
            <span ref={labelRef} className="truncate">
              {label}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="max-w-[360px] whitespace-normal break-words text-xs">
          {agentName} · {label}
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        aria-label="Delete session"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className={cn(
          'absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg transition-opacity',
          'opacity-0 group-hover/row:opacity-100',
          'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ConversationListPane({ width }: ConversationListPaneProps) {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const agents = useAgentsStore((state) => state.agents);
  const sessions = useChatStore((state) => state.sessions);
  const currentSessionKey = useChatStore((state) => state.currentSessionKey);
  const sessionLabels = useChatStore((state) => state.sessionLabels);
  const sessionLastActivity = useChatStore((state) => state.sessionLastActivity);
  const switchSession = useChatStore((state) => state.switchSession);
  const newSession = useChatStore((state) => state.newSession);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const deleteSession = useChatStore((state) => state.deleteSession);

  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);

  const getSessionLabel = useCallback((key: string, displayName?: string, label?: string) =>
    sessionLabels[key] ?? label ?? displayName ?? key, [sessionLabels]);

  const groups = useMemo(
    () => buildAgentSessionGroups(agents, sessions, sessionLastActivity),
    [agents, sessionLastActivity, sessions],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => {
        const agentMatches = group.agentName.toLowerCase().includes(normalizedQuery);
        const matchingSessions = group.sessions.filter((session) =>
          getSessionLabel(session.key, session.displayName, session.label).toLowerCase().includes(normalizedQuery)
        );
        return {
          ...group,
          sessions: agentMatches ? group.sessions : matchingSessions,
        };
      })
      .filter((group) => group.agentName.toLowerCase().includes(normalizedQuery) || group.sessions.length > 0);
  }, [getSessionLabel, groups, normalizedQuery]);

  const handleCreateCustomPartner = useCallback(() => {
    setCreateMenuOpen(false);
    newSession('main');
    void sendMessage(CUSTOM_PARTNER_PROMPT, undefined, null);
  }, [newSession, sendMessage]);

  return (
    <aside
      data-testid="conversation-list-pane"
      className="relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-black/[0.04] bg-[#fbfbfa] dark:border-white/[0.06] dark:bg-background"
      style={{ width }}
    >
      <div className="flex shrink-0 flex-col gap-4 px-4 pb-3 pt-5">
        <div>
          <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-foreground">
            {t('sidebar.chat')}
          </h2>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38" />
          <input
            data-testid="conversation-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('conversationPanel.searchPlaceholder')}
            className="h-11 w-full rounded-full border border-black/[0.08] bg-background/72 pl-9 pr-4 text-[14px] text-foreground outline-none transition focus:border-foreground/20 focus:bg-background focus:ring-2 focus:ring-foreground/[0.06] dark:border-white/[0.09] dark:bg-white/[0.04] dark:focus:bg-white/[0.07]"
          />
        </label>
      </div>

      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-2">
          {filteredGroups.map((group) => {
            const collapsed = !normalizedQuery && collapsedGroups[group.agentId];
            const visibleSessions = collapsed ? [] : group.sessions;
            return (
              <section key={group.agentId} data-testid={`conversation-agent-group-${group.agentId}`} className="rounded-[18px]">
                <button
                  type="button"
                  data-testid={`conversation-agent-toggle-${group.agentId}`}
                  aria-expanded={!collapsed}
                  onClick={() =>
                    setCollapsedGroups((current) => ({
                      ...current,
                      [group.agentId]: !current[group.agentId],
                    }))
                  }
                  className="flex w-full items-center gap-2 rounded-[16px] px-2.5 py-2 text-left transition-colors hover:bg-background/70 dark:hover:bg-white/[0.05]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-[13px] font-bold shadow-sm ring-1 ring-black/[0.04] dark:bg-white/[0.06] dark:ring-white/[0.08]">
                    {getAgentInitial(group.agentName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                        {group.agentName}
                      </span>
                      {group.isDefault && (
                        <span className="shrink-0 rounded-full bg-foreground/[0.07] px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
                          {t('conversationPanel.defaultBadge')}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-foreground/42">
                      {t('conversationPanel.sessionCount', { count: group.sessions.length })}
                    </span>
                  </span>
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-foreground/42" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-foreground/42" />
                  )}
                </button>

                {visibleSessions.length > 0 && (
                  <div className="mt-1 space-y-1 pl-4">
                    {visibleSessions.map((session) => {
                      const sessionLabel = getSessionLabel(session.key, session.displayName, session.label);
                      return (
                        <ConversationSessionRow
                          key={session.key}
                          sessionKey={session.key}
                          label={sessionLabel}
                          agentName={group.agentName}
                          active={currentSessionKey === session.key}
                          onSelect={() => switchSession(session.key)}
                          onDelete={() => setSessionToDelete({ key: session.key, label: sessionLabel })}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="relative shrink-0 border-t border-black/[0.06] p-3 dark:border-white/[0.07]">
        {createMenuOpen && (
          <div
            data-testid="conversation-create-menu"
            className="absolute bottom-[62px] left-3 right-3 z-20 overflow-hidden rounded-[18px] border border-black/[0.08] bg-background p-1.5 shadow-xl dark:border-white/[0.1] dark:bg-card"
          >
            <button
              type="button"
              data-testid="conversation-create-custom"
              onClick={handleCreateCustomPartner}
              className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-foreground/78 transition-colors hover:bg-accent hover:text-foreground"
            >
              <MessageCirclePlus className="h-4 w-4" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{t('conversationPanel.customPartner')}</span>
                <span className="block text-[11px] text-foreground/50">{t('conversationPanel.customPartnerHint')}</span>
              </span>
            </button>
            <button
              type="button"
              data-testid="conversation-create-market"
              onClick={() => {
                setCreateMenuOpen(false);
                navigate('/agents');
              }}
              className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-foreground/78 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Compass className="h-4 w-4" />
              <span className="min-w-0 flex-1 text-[13px] font-semibold">{t('conversationPanel.chooseFromMarket')}</span>
            </button>
          </div>
        )}
        <button
          type="button"
          data-testid="conversation-create-partner"
          onClick={() => setCreateMenuOpen((open) => !open)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[16px] border border-black/[0.1] bg-background text-[14px] font-semibold text-foreground/72 shadow-sm transition-colors hover:bg-accent hover:text-foreground dark:border-white/[0.1] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
        >
          <Plus className="h-4 w-4" />
          {t('conversationPanel.createPartner')}
          <MoreHorizontal className="h-4 w-4 text-foreground/38" />
        </button>
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
          setSessionToDelete(null);
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </aside>
  );
}
