import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bot, Check, FileText, LibraryBig, MessageCircle, Plus, RefreshCw, Settings2, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useProviderStore } from '@/stores/providers';
import { getAgentMarketCatalog, loadAgentTemplateDetail } from '@/lib/agent-market';
import { hostApiFetch } from '@/lib/host-api';
import { subscribeHostEvent } from '@/lib/host-events';
import { CHANNEL_ICONS, CHANNEL_NAMES, type ChannelType } from '@/types/channel';
import type { AgentMarketCategory, AgentSummary, AgentTemplateSummary } from '@/types/agent';
import type { ProviderAccount, ProviderVendorInfo, ProviderWithKeyInfo } from '@/lib/providers';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import telegramIcon from '@/assets/channels/telegram.svg';
import discordIcon from '@/assets/channels/discord.svg';
import whatsappIcon from '@/assets/channels/whatsapp.svg';
import wechatIcon from '@/assets/channels/wechat.svg';
import dingtalkIcon from '@/assets/channels/dingtalk.svg';
import feishuIcon from '@/assets/channels/feishu.svg';
import wecomIcon from '@/assets/channels/wecom.svg';
import qqIcon from '@/assets/channels/qq.svg';

interface ChannelAccountItem {
  accountId: string;
  name: string;
  configured: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError?: string;
  isDefault: boolean;
  agentId?: string;
}

interface ChannelGroupItem {
  channelType: string;
  defaultAccountId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  accounts: ChannelAccountItem[];
}

interface RuntimeProviderOption {
  runtimeProviderKey: string;
  accountId: string;
  label: string;
  modelIdPlaceholder?: string;
  configuredModelId?: string;
}

function resolveRuntimeProviderKey(account: ProviderAccount): string {
  if (account.authMode === 'oauth_browser') {
    if (account.vendorId === 'google') return 'google-gemini-cli';
    if (account.vendorId === 'openai') return 'openai-codex';
  }

  if (account.vendorId === 'custom' || account.vendorId === 'ollama') {
    const suffix = account.id.replace(/-/g, '').slice(0, 8);
    return `${account.vendorId}-${suffix}`;
  }

  if (account.vendorId === 'minimax-portal-cn') {
    return 'minimax-portal';
  }

  return account.vendorId;
}

function splitModelRef(modelRef: string | null | undefined): { providerKey: string; modelId: string } | null {
  const value = (modelRef || '').trim();
  if (!value) return null;
  const separatorIndex = value.indexOf('/');
  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) return null;
  return {
    providerKey: value.slice(0, separatorIndex),
    modelId: value.slice(separatorIndex + 1),
  };
}

function hasConfiguredProviderCredentials(
  account: ProviderAccount,
  statusById: Map<string, ProviderWithKeyInfo>,
): boolean {
  if (account.authMode === 'oauth_device' || account.authMode === 'oauth_browser' || account.authMode === 'local') {
    return true;
  }
  return statusById.get(account.id)?.hasKey ?? false;
}

export function Agents() {
  const { t } = useTranslation('agents');
  const navigate = useNavigate();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const refreshProviderSnapshot = useProviderStore((state) => state.refreshProviderSnapshot);
  const switchSession = useChatStore((state) => state.switchSession);
  const lastGatewayStateRef = useRef(gatewayStatus.state);
  const {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    createAgentFromTemplate,
    deleteAgent,
  } = useAgentsStore();
  const marketCatalog = useMemo(() => getAgentMarketCatalog(), []);
  const templatesByCategory = useMemo(() => {
    const grouped = new Map<string, AgentTemplateSummary[]>();
    for (const template of marketCatalog.templates) {
      const templates = grouped.get(template.categoryId) ?? [];
      templates.push(template);
      grouped.set(template.categoryId, templates);
    }
    return grouped;
  }, [marketCatalog.templates]);
  const [channelGroups, setChannelGroups] = useState<ChannelGroupItem[]>([]);
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(() => agents.length > 0);
  const [scene, setScene] = useState<'market' | 'manage'>('market');
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentSummary | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);

  const fetchChannelAccounts = useCallback(async () => {
    try {
      const response = await hostApiFetch<{ success: boolean; channels?: ChannelGroupItem[] }>('/api/channels/accounts');
      setChannelGroups(response.channels || []);
    } catch {
      // Keep the last rendered snapshot when channel account refresh fails.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([fetchAgents(), fetchChannelAccounts(), refreshProviderSnapshot()]).finally(() => {
      if (mounted) {
        setHasCompletedInitialLoad(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [fetchAgents, fetchChannelAccounts, refreshProviderSnapshot]);

  useEffect(() => {
    const unsubscribe = subscribeHostEvent('gateway:channel-status', () => {
      void fetchChannelAccounts();
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchChannelAccounts]);

  useEffect(() => {
    const previousGatewayState = lastGatewayStateRef.current;
    lastGatewayStateRef.current = gatewayStatus.state;

    if (previousGatewayState !== 'running' && gatewayStatus.state === 'running') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchChannelAccounts();
    }
  }, [fetchChannelAccounts, gatewayStatus.state]);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? null,
    [activeAgentId, agents],
  );

  const visibleAgents = agents;
  const visibleChannelGroups = channelGroups;
  const isUsingStableValue = loading && hasCompletedInitialLoad;
  const installedTemplateIds = useMemo(() => new Set(agents.map((agent) => agent.templateId || agent.id)), [agents]);
  const handleRefresh = () => {
    void Promise.all([fetchAgents(), fetchChannelAccounts()]);
  };
  const handleStartAgentSession = useCallback((agentId: string) => {
    const agent = agents.find((candidate) => candidate.id === agentId);
    switchSession(agent?.mainSessionKey || `agent:${agentId}:main`);
    navigate('/');
  }, [agents, navigate, switchSession]);

  const handleAddTemplate = useCallback(async (template: AgentTemplateSummary) => {
    setAddingTemplateId(template.templateId);
    try {
      const detail = await loadAgentTemplateDetail(template.templateId, template.categoryId);
      await createAgentFromTemplate(detail);
      toast.success(t('toast.templateAdded', { name: template.name }));
    } catch (error) {
      toast.error(t('toast.templateAddFailed', { error: String(error) }));
    } finally {
      setAddingTemplateId(null);
    }
  }, [createAgentFromTemplate, t]);

  if (loading && !hasCompletedInitialLoad) {
    return (
      <div className="flex flex-col -m-6 dark:bg-background min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div data-testid="agents-page" className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full p-6 md:p-10 pt-12 md:pt-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 shrink-0 gap-4">
          <div>
            <h1
              className="text-5xl md:text-6xl font-serif text-foreground mb-3 font-normal tracking-tight"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
            >
              {t('title')}
            </h1>
            <p className="text-[17px] text-foreground/70 font-medium">{t('subtitle')}</p>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted-foreground">
              {t('market.sourceNote', {
                count: marketCatalog.templates.length,
                categories: marketCatalog.categories.length,
                commit: marketCatalog.sourceCommitShort,
              })}
            </p>
          </div>
          <div className="flex items-center gap-3 md:mt-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isUsingStableValue && 'animate-spin')} />
              {t('refresh')}
            </Button>
            <Button
              data-testid="agents-add-agent"
              onClick={() => setShowAddDialog(true)}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              {t('addAgent')}
            </Button>
          </div>
        </div>

        <div className="mb-6 flex w-fit rounded-full border border-border bg-muted/40 p-1">
          <button
            type="button"
            data-testid="agents-scene-market"
            onClick={() => setScene('market')}
            className={cn(
              'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
              scene === 'market' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('scene.market')}
          </button>
          <button
            type="button"
            data-testid="agents-scene-manage"
            onClick={() => setScene('manage')}
            className={cn(
              'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
              scene === 'manage' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t('scene.manage')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2">
          {gatewayStatus.state !== 'running' && (
            <div className="mb-8 p-4 rounded-xl border border-yellow-500/50 bg-yellow-500/10 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                {t('gatewayWarning')}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 rounded-xl border border-destructive/50 bg-destructive/10 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive text-sm font-medium">
                {error}
              </span>
            </div>
          )}

          {scene === 'market' ? (
            <AgentMarket
              categories={marketCatalog.categories}
              templatesByCategory={templatesByCategory}
              installedTemplateIds={installedTemplateIds}
              addingTemplateId={addingTemplateId}
              agents={visibleAgents}
              onAddTemplate={(template) => void handleAddTemplate(template)}
              onStartAgentSession={handleStartAgentSession}
            />
          ) : (
            <div className="space-y-3" data-testid="agents-manage-list">
              {visibleAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  channelGroups={visibleChannelGroups}
                  onOpenSettings={() => setActiveAgentId(agent.id)}
                  onEditFiles={() => setEditingAgent(agent)}
                  onStartChat={() => handleStartAgentSession(agent.id)}
                  onDelete={() => setAgentToDelete(agent)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddDialog && (
        <AddAgentDialog
          onClose={() => setShowAddDialog(false)}
          onCreate={async (name, options) => {
            await createAgent(name, options);
            setShowAddDialog(false);
            toast.success(t('toast.agentCreated'));
          }}
        />
      )}

      {activeAgent && (
        <AgentSettingsModal
          agent={activeAgent}
          channelGroups={visibleChannelGroups}
          onClose={() => setActiveAgentId(null)}
        />
      )}

      {editingAgent && (
        <AgentFilesDrawer
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}

      <ConfirmDialog
        open={!!agentToDelete}
        title={t('deleteDialog.title')}
        message={agentToDelete ? t('deleteDialog.message', { name: agentToDelete.name }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (!agentToDelete) return;
          try {
            await deleteAgent(agentToDelete.id);
            const deletedId = agentToDelete.id;
            setAgentToDelete(null);
            if (activeAgentId === deletedId) {
              setActiveAgentId(null);
            }
            toast.success(t('toast.agentDeleted'));
          } catch (error) {
            toast.error(t('toast.agentDeleteFailed', { error: String(error) }));
          }
        }}
        onCancel={() => setAgentToDelete(null)}
      />
    </div>
  );
}

function AgentCard({
  agent,
  channelGroups,
  onOpenSettings,
  onEditFiles,
  onStartChat,
  onDelete,
}: {
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onOpenSettings: () => void;
  onEditFiles: () => void;
  onStartChat: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('agents');
  const boundChannelAccounts = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => {
        const channelName = CHANNEL_NAMES[group.channelType as ChannelType] || group.channelType;
        const accountLabel =
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId;
        return `${channelName} · ${accountLabel}`;
      }),
  );
  const channelsText = boundChannelAccounts.length > 0
    ? boundChannelAccounts.join(', ')
    : t('none');

  return (
    <div
      data-testid={`agent-card-${agent.id}`}
      className={cn(
        'group flex items-start gap-4 p-4 rounded-2xl transition-all text-left border relative overflow-hidden bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5',
        agent.isDefault && 'bg-black/[0.04] dark:bg-white/[0.06]'
      )}
    >
      <div className="h-[46px] w-[46px] shrink-0 flex items-center justify-center text-primary bg-primary/10 rounded-full shadow-sm mb-3">
        <Bot className="h-[22px] w-[22px]" />
      </div>
      <div className="flex flex-col flex-1 min-w-0 py-0.5 mt-1">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[16px] font-semibold text-foreground truncate">{agent.name}</h2>
            {agent.isDefault && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 font-mono text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] border-0 shadow-none text-foreground/70"
              >
                <Check className="h-3 w-3" />
                {t('defaultBadge')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              data-testid={`agent-chat-${agent.id}`}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
              onClick={onStartChat}
              title={t('market.chat')}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              data-testid={`agent-files-${agent.id}`}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
              onClick={onEditFiles}
              title={t('files.edit')}
            >
              <FileText className="h-4 w-4" />
            </Button>
            {!agent.isDefault && (
              <Button
                data-testid={`agent-delete-${agent.id}`}
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                onClick={onDelete}
                title={t('deleteAgent')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              data-testid={`agent-settings-${agent.id}`}
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all',
                !agent.isDefault && 'opacity-0 group-hover:opacity-100',
              )}
              onClick={onOpenSettings}
              title={t('settings')}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[13.5px] text-muted-foreground line-clamp-2 leading-[1.5]">
          {t('modelLine', {
            model: agent.modelDisplay,
            suffix: agent.inheritedModel ? ` (${t('inherited')})` : '',
          })}
        </p>
        <p className="text-[13.5px] text-muted-foreground line-clamp-2 leading-[1.5]">
          {t('channelsLine', { channels: channelsText })}
        </p>
        {agent.sourceRepo && (
          <p className="mt-1 text-[12px] text-muted-foreground/80 line-clamp-1">
            {t('manage.importedFrom', { repo: agent.sourceRepo, path: agent.sourcePath || agent.categoryId || agent.id })}
          </p>
        )}
      </div>
    </div>
  );
}

function AgentMarket({
  categories,
  templatesByCategory,
  installedTemplateIds,
  addingTemplateId,
  agents,
  onAddTemplate,
  onStartAgentSession,
}: {
  categories: AgentMarketCategory[];
  templatesByCategory: Map<string, AgentTemplateSummary[]>;
  installedTemplateIds: Set<string>;
  addingTemplateId: string | null;
  agents: AgentSummary[];
  onAddTemplate: (template: AgentTemplateSummary) => void;
  onStartAgentSession: (agentId: string) => void;
}) {
  const { t } = useTranslation('agents');
  const installedByTemplateId = useMemo(() => {
    const result = new Map<string, AgentSummary>();
    for (const agent of agents) {
      result.set(agent.templateId || agent.id, agent);
    }
    return result;
  }, [agents]);

  return (
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]" data-testid="agents-market">
      <nav className="lg:sticky lg:top-0 lg:self-start rounded-[2rem] border border-border bg-card/70 p-3 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center gap-2 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <LibraryBig className="h-4 w-4" />
          {t('market.catalog')}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              data-testid={`agents-category-${category.id}`}
              onClick={() => {
                document.getElementById(`agent-market-${category.id}`)?.scrollIntoView({
                  block: 'start',
                  behavior: 'smooth',
                });
              }}
              className="flex shrink-0 items-center justify-between gap-3 rounded-full px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:rounded-2xl"
            >
              <span className="whitespace-nowrap">{t(`categories.${category.id}`, category.name)}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <div className="space-y-10">
        {categories.map((category) => {
          const templates = templatesByCategory.get(category.id) ?? [];
          return (
            <section
              key={category.id}
              id={`agent-market-${category.id}`}
              data-testid={`agents-market-section-${category.id}`}
              className="scroll-mt-8"
            >
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-normal tracking-tight text-foreground">
                    {t(`categories.${category.id}`, category.name)}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {t('market.sectionCount', { count: templates.length })}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => {
                  const installed = installedTemplateIds.has(template.templateId);
                  const installedAgent = installedByTemplateId.get(template.templateId);
                  return (
                    <article
                      key={template.templateId}
                      data-testid={`agent-template-${template.templateId}`}
                      className="group flex min-h-[188px] flex-col rounded-[1.75rem] border border-border bg-card/65 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted text-xl">
                          {template.emoji || <Bot className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug text-foreground">
                            {template.name}
                          </h3>
                          <p className="mt-1 line-clamp-3 text-[13px] leading-5 text-muted-foreground">
                            {template.description}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                        {template.sourceRepo} · {template.version}
                      </p>
                      <div className="mt-auto flex items-center justify-end gap-2 pt-5">
                        {installed ? (
                          <>
                            <Button
                              variant="outline"
                              className="h-8 rounded-full px-3 text-[12px]"
                              disabled
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              {t('market.added')}
                            </Button>
                            <Button
                              data-testid={`agent-template-chat-${template.templateId}`}
                              className="h-8 rounded-full px-3 text-[12px]"
                              onClick={() => onStartAgentSession(installedAgent?.id || template.templateId)}
                            >
                              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                              {t('market.chat')}
                            </Button>
                          </>
                        ) : (
                          <Button
                            data-testid={`agent-template-add-${template.templateId}`}
                            className="h-8 rounded-full px-3 text-[12px]"
                            disabled={addingTemplateId === template.templateId}
                            onClick={() => onAddTemplate(template)}
                          >
                            {addingTemplateId === template.templateId ? (
                              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {t('market.add')}
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const inputClasses = 'app-field h-[44px] rounded-xl font-mono text-[13px] shadow-sm';
const selectClasses = 'app-field h-[44px] w-full rounded-xl px-3 font-mono text-[13px] shadow-sm';
const labelClasses = 'text-[14px] text-foreground/80 font-bold';

function ChannelLogo({ type }: { type: ChannelType }) {
  switch (type) {
    case 'telegram':
      return <img src={telegramIcon} alt="Telegram" className="w-[20px] h-[20px] dark:invert" />;
    case 'discord':
      return <img src={discordIcon} alt="Discord" className="w-[20px] h-[20px] dark:invert" />;
    case 'whatsapp':
      return <img src={whatsappIcon} alt="WhatsApp" className="w-[20px] h-[20px] dark:invert" />;
    case 'wechat':
      return <img src={wechatIcon} alt="WeChat" className="w-[20px] h-[20px] dark:invert" />;
    case 'dingtalk':
      return <img src={dingtalkIcon} alt="DingTalk" className="w-[20px] h-[20px] dark:invert" />;
    case 'feishu':
      return <img src={feishuIcon} alt="Feishu" className="w-[20px] h-[20px] dark:invert" />;
    case 'wecom':
      return <img src={wecomIcon} alt="WeCom" className="w-[20px] h-[20px] dark:invert" />;
    case 'qqbot':
      return <img src={qqIcon} alt="QQ" className="w-[20px] h-[20px] dark:invert" />;
    default:
      return <span className="text-[20px] leading-none">{CHANNEL_ICONS[type] || '💬'}</span>;
  }
}

function AddAgentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, options: { inheritWorkspace: boolean }) => Promise<void>;
}) {
  const { t } = useTranslation('agents');
  const [name, setName] = useState('');
  const [inheritWorkspace, setInheritWorkspace] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), { inheritWorkspace });
    } catch (error) {
      toast.error(t('toast.agentCreateFailed', { error: String(error) }));
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card data-testid="add-agent-dialog-content" className="app-surface w-full max-w-md overflow-hidden border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-serif font-normal tracking-tight">
            {t('createDialog.title')}
          </CardTitle>
          <CardDescription className="text-[15px] mt-1 text-foreground/70">
            {t('createDialog.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 p-6">
          <div className="space-y-2.5">
            <Label htmlFor="agent-name" className={labelClasses}>{t('createDialog.nameLabel')}</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('createDialog.namePlaceholder')}
              className={inputClasses}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inherit-workspace" className={labelClasses}>{t('createDialog.inheritWorkspaceLabel')}</Label>
              <p className="text-[13px] text-foreground/60">{t('createDialog.inheritWorkspaceDescription')}</p>
            </div>
            <Switch
              id="inherit-workspace"
              checked={inheritWorkspace}
              onCheckedChange={setInheritWorkspace}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="add-agent-dialog-cancel"
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving || !name.trim()}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                t('common:actions.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentSettingsModal({
  agent,
  channelGroups,
  onClose,
}: {
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const { updateAgent, defaultModelRef } = useAgentsStore();
  const [name, setName] = useState(agent.name);
  const [savingName, setSavingName] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    setName(agent.name);
  }, [agent.name]);

  const hasNameChanges = name.trim() !== agent.name;

  const handleRequestClose = () => {
    if (savingName || hasNameChanges) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === agent.name) return;
    setSavingName(true);
    try {
      await updateAgent(agent.id, name.trim());
      toast.success(t('toast.agentUpdated'));
    } catch (error) {
      toast.error(t('toast.agentUpdateFailed', { error: String(error) }));
    } finally {
      setSavingName(false);
    }
  };

  const assignedChannels = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => ({
        channelType: group.channelType as ChannelType,
        accountId: account.accountId,
        name:
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId,
        error: account.lastError,
      })),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card
        data-testid="agent-settings-modal-content"
        className="app-surface w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border-0"
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2 shrink-0">
          <div>
            <CardTitle className="text-2xl font-serif font-normal tracking-tight">
              {t('settingsDialog.title', { name: agent.name })}
            </CardTitle>
            <CardDescription className="text-[15px] mt-1 text-foreground/70">
              {t('settingsDialog.description')}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRequestClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="agent-settings-name" className={labelClasses}>{t('settingsDialog.nameLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  id="agent-settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  readOnly={agent.isDefault}
                  className={inputClasses}
                />
                {!agent.isDefault && (
                  <Button
                    variant="outline"
                    onClick={() => void handleSaveName()}
                    disabled={savingName || !name.trim() || name.trim() === agent.name}
                    className="app-subtle-button h-[44px] rounded-xl px-4 text-[13px] font-medium"
                  >
                    {savingName ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      t('common:actions.save')
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/80 font-medium">
                  {t('settingsDialog.agentIdLabel')}
                </p>
                <p className="font-mono text-[13px] text-foreground">{agent.id}</p>
              </div>
              <button
                data-testid="agent-model-open"
                type="button"
                onClick={() => setShowModelModal(true)}
                className="space-y-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent p-4 text-left hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/80 font-medium">
                  {t('settingsDialog.modelLabel')}
                </p>
                <p className="text-[13.5px] text-foreground">
                  {agent.modelDisplay}
                  {agent.inheritedModel ? ` (${t('inherited')})` : ''}
                </p>
                <p className="font-mono text-[12px] text-foreground/70 break-all">
                  {agent.modelRef || defaultModelRef || '-'}
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif text-foreground font-normal tracking-tight">
                  {t('settingsDialog.channelsTitle')}
                </h3>
                <p className="text-[14px] text-foreground/70 mt-1">{t('settingsDialog.channelsDescription')}</p>
              </div>
            </div>

            {assignedChannels.length === 0 && agent.channelTypes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-[13.5px] text-muted-foreground">
                {t('settingsDialog.noChannels')}
              </div>
            ) : (
              <div className="space-y-3">
                {assignedChannels.map((channel) => (
                  <div key={`${channel.channelType}-${channel.accountId}`} className="flex items-center justify-between rounded-2xl bg-black/5 dark:bg-white/5 border border-transparent p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-[40px] w-[40px] shrink-0 flex items-center justify-center text-foreground bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full shadow-sm">
                        <ChannelLogo type={channel.channelType} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-foreground">{channel.name}</p>
                        <p className="text-[13.5px] text-muted-foreground">
                          {CHANNEL_NAMES[channel.channelType]} · {channel.accountId === 'default' ? t('settingsDialog.mainAccount') : channel.accountId}
                        </p>
                        {channel.error && (
                          <p className="text-xs text-destructive mt-1">{channel.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0" />
                  </div>
                ))}
                {assignedChannels.length === 0 && agent.channelTypes.length > 0 && (
                  <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 text-[13.5px] text-muted-foreground">
                    {t('settingsDialog.channelsManagedInChannels')}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {showModelModal && (
        <AgentModelModal
          agent={agent}
          onClose={() => setShowModelModal(false)}
        />
      )}
      <ConfirmDialog
        open={showCloseConfirm}
        title={t('settingsDialog.unsavedChangesTitle')}
        message={t('settingsDialog.unsavedChangesMessage')}
        confirmLabel={t('settingsDialog.closeWithoutSaving')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => {
          setShowCloseConfirm(false);
          setName(agent.name);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  );
}

function AgentModelModal({
  agent,
  onClose,
}: {
  agent: AgentSummary;
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const providerAccounts = useProviderStore((state) => state.accounts);
  const providerStatuses = useProviderStore((state) => state.statuses);
  const providerVendors = useProviderStore((state) => state.vendors);
  const providerDefaultAccountId = useProviderStore((state) => state.defaultAccountId);
  const { updateAgentModel, defaultModelRef } = useAgentsStore();
  const [selectedRuntimeProviderKey, setSelectedRuntimeProviderKey] = useState('');
  const [modelIdInput, setModelIdInput] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const runtimeProviderOptions = useMemo<RuntimeProviderOption[]>(() => {
    const vendorMap = new Map<string, ProviderVendorInfo>(providerVendors.map((vendor) => [vendor.id, vendor]));
    const statusById = new Map<string, ProviderWithKeyInfo>(providerStatuses.map((status) => [status.id, status]));
    const entries = providerAccounts
      .filter((account) => account.enabled && hasConfiguredProviderCredentials(account, statusById))
      .sort((left, right) => {
        if (left.id === providerDefaultAccountId) return -1;
        if (right.id === providerDefaultAccountId) return 1;
        return right.updatedAt.localeCompare(left.updatedAt);
      });

    const deduped = new Map<string, RuntimeProviderOption>();
    for (const account of entries) {
      const runtimeProviderKey = resolveRuntimeProviderKey(account);
      if (!runtimeProviderKey || deduped.has(runtimeProviderKey)) continue;
      const vendor = vendorMap.get(account.vendorId);
      const label = `${account.label} (${vendor?.name || account.vendorId})`;
      const configuredModelId = account.model
        ? (account.model.startsWith(`${runtimeProviderKey}/`)
          ? account.model.slice(runtimeProviderKey.length + 1)
          : account.model)
        : undefined;

      deduped.set(runtimeProviderKey, {
        runtimeProviderKey,
        accountId: account.id,
        label,
        modelIdPlaceholder: vendor?.modelIdPlaceholder,
        configuredModelId,
      });
    }

    return [...deduped.values()];
  }, [providerAccounts, providerDefaultAccountId, providerStatuses, providerVendors]);

  useEffect(() => {
    const override = splitModelRef(agent.overrideModelRef);
    if (override) {
      setSelectedRuntimeProviderKey(override.providerKey);
      setModelIdInput(override.modelId);
      return;
    }

    const effective = splitModelRef(agent.modelRef || defaultModelRef);
    if (effective) {
      setSelectedRuntimeProviderKey(effective.providerKey);
      setModelIdInput(effective.modelId);
      return;
    }

    setSelectedRuntimeProviderKey(runtimeProviderOptions[0]?.runtimeProviderKey || '');
    setModelIdInput('');
  }, [agent.modelRef, agent.overrideModelRef, defaultModelRef, runtimeProviderOptions]);

  const selectedProvider = runtimeProviderOptions.find((option) => option.runtimeProviderKey === selectedRuntimeProviderKey) || null;
  const trimmedModelId = modelIdInput.trim();
  const nextModelRef = selectedRuntimeProviderKey && trimmedModelId
    ? `${selectedRuntimeProviderKey}/${trimmedModelId}`
    : '';
  const normalizedDefaultModelRef = (defaultModelRef || '').trim();
  const isUsingDefaultModelInForm = Boolean(normalizedDefaultModelRef) && nextModelRef === normalizedDefaultModelRef;
  const currentOverrideModelRef = (agent.overrideModelRef || '').trim();
  const desiredOverrideModelRef = nextModelRef && nextModelRef !== normalizedDefaultModelRef
    ? nextModelRef
    : null;
  const modelChanged = (desiredOverrideModelRef || '') !== currentOverrideModelRef;

  const handleRequestClose = () => {
    if (savingModel || modelChanged) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleSaveModel = async () => {
    if (!selectedRuntimeProviderKey) {
      toast.error(t('toast.agentModelProviderRequired'));
      return;
    }
    if (!trimmedModelId) {
      toast.error(t('toast.agentModelIdRequired'));
      return;
    }
    if (!modelChanged) return;
    if (!nextModelRef.includes('/')) {
      toast.error(t('toast.agentModelInvalid'));
      return;
    }

    setSavingModel(true);
    try {
      await updateAgentModel(agent.id, desiredOverrideModelRef);
      toast.success(desiredOverrideModelRef ? t('toast.agentModelUpdated') : t('toast.agentModelReset'));
      onClose();
    } catch (error) {
      toast.error(t('toast.agentModelUpdateFailed', { error: String(error) }));
    } finally {
      setSavingModel(false);
    }
  };

  const handleUseDefaultModel = () => {
    const parsedDefault = splitModelRef(normalizedDefaultModelRef);
    if (!parsedDefault) {
      setSelectedRuntimeProviderKey('');
      setModelIdInput('');
      return;
    }
    setSelectedRuntimeProviderKey(parsedDefault.providerKey);
    setModelIdInput(parsedDefault.modelId);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <Card
        data-testid="agent-model-modal-content"
        className="app-surface w-full max-w-xl overflow-hidden border-0"
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-serif font-normal tracking-tight">
              {t('settingsDialog.modelLabel')}
            </CardTitle>
            <CardDescription className="text-[15px] mt-1 text-foreground/70">
              {t('settingsDialog.modelOverrideDescription', { defaultModel: defaultModelRef || '-' })}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRequestClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="agent-model-provider" className="text-[12px] text-foreground/70">{t('settingsDialog.modelProviderLabel')}</Label>
            <select
              id="agent-model-provider"
              value={selectedRuntimeProviderKey}
              onChange={(event) => {
                const nextProvider = event.target.value;
                setSelectedRuntimeProviderKey(nextProvider);
                if (!modelIdInput.trim()) {
                  const option = runtimeProviderOptions.find((candidate) => candidate.runtimeProviderKey === nextProvider);
                  setModelIdInput(option?.configuredModelId || '');
                }
              }}
              className={selectClasses}
            >
              <option value="">{t('settingsDialog.modelProviderPlaceholder')}</option>
              {runtimeProviderOptions.map((option) => (
                <option key={option.runtimeProviderKey} value={option.runtimeProviderKey}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-model-id" className="text-[12px] text-foreground/70">{t('settingsDialog.modelIdLabel')}</Label>
            <Input
              id="agent-model-id"
              value={modelIdInput}
              onChange={(event) => setModelIdInput(event.target.value)}
              placeholder={selectedProvider?.modelIdPlaceholder || selectedProvider?.configuredModelId || t('settingsDialog.modelIdPlaceholder')}
              className={inputClasses}
            />
          </div>
          {!!nextModelRef && (
            <p className="text-[12px] font-mono text-foreground/70 break-all">
              {t('settingsDialog.modelPreview')}: {nextModelRef}
            </p>
          )}
          {runtimeProviderOptions.length === 0 && (
            <p className="text-[12px] text-amber-600 dark:text-amber-400">
              {t('settingsDialog.modelProviderEmpty')}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleUseDefaultModel}
              disabled={savingModel || !normalizedDefaultModelRef || isUsingDefaultModelInForm}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('settingsDialog.useDefaultModel')}
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestClose}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSaveModel()}
              disabled={savingModel || !selectedRuntimeProviderKey || !trimmedModelId || !modelChanged}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              {savingModel ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                t('common:actions.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={showCloseConfirm}
        title={t('settingsDialog.unsavedChangesTitle')}
        message={t('settingsDialog.unsavedChangesMessage')}
        confirmLabel={t('settingsDialog.closeWithoutSaving')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>
  );
}

const editableAgentFiles = ['SOUL.md', 'AGENTS.md', 'IDENTITY.md'] as const;
type EditableAgentFile = typeof editableAgentFiles[number];

function AgentFilesDrawer({
  agent,
  onClose,
}: {
  agent: AgentSummary;
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const [activeFile, setActiveFile] = useState<EditableAgentFile>('AGENTS.md');
  const [contentByFile, setContentByFile] = useState<Partial<Record<EditableAgentFile, string>>>({});
  const [draft, setDraft] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingFile(true);
    void hostApiFetch<{ success: boolean; content: string }>(
      `/api/agents/${encodeURIComponent(agent.id)}/files/${encodeURIComponent(activeFile)}`,
    )
      .then((response) => {
        if (!mounted) return;
        const content = response.content ?? '';
        setContentByFile((current) => ({ ...current, [activeFile]: content }));
        setDraft(content);
      })
      .catch((error) => {
        if (!mounted) return;
        toast.error(t('toast.fileLoadFailed', { error: String(error) }));
        setDraft('');
      })
      .finally(() => {
        if (mounted) setLoadingFile(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeFile, agent.id, t]);

  const hasChanges = draft !== (contentByFile[activeFile] ?? '');

  const handleSaveFile = async () => {
    setSavingFile(true);
    try {
      await hostApiFetch<{ success: boolean; content: string }>(
        `/api/agents/${encodeURIComponent(agent.id)}/files/${encodeURIComponent(activeFile)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ content: draft }),
        },
      );
      setContentByFile((current) => ({ ...current, [activeFile]: draft }));
      toast.success(t('toast.fileSaved'));
    } catch (error) {
      toast.error(t('toast.fileSaveFailed', { error: String(error) }));
    } finally {
      setSavingFile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div
        data-testid="agent-files-drawer"
        className="app-surface flex h-full w-full max-w-3xl flex-col border-l border-border shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <h2 className="text-2xl font-serif font-normal tracking-tight text-foreground">
              {t('files.title', { name: agent.name })}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {agent.sourceRepo
                ? t('files.source', { repo: agent.sourceRepo, path: agent.sourcePath || agent.id })
                : t('files.description')}
            </p>
          </div>
          <Button
            data-testid="agent-files-close"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border p-4">
          {editableAgentFiles.map((file) => (
            <Button
              key={file}
              type="button"
              variant={activeFile === file ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-[12px]"
              onClick={() => setActiveFile(file)}
              disabled={savingFile}
            >
              {file}
            </Button>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          {loadingFile ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <Textarea
              data-testid="agent-file-editor"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-0 flex-1 resize-none rounded-2xl font-mono text-[13px] leading-6"
            />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 rounded-full px-4 text-[13px]"
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            data-testid="agent-file-save"
            onClick={() => void handleSaveFile()}
            disabled={loadingFile || savingFile || !hasChanges}
            className="h-9 rounded-full px-4 text-[13px]"
          >
            {savingFile ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('common:actions.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Agents;
