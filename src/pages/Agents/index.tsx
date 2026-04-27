import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Bug,
  CalendarDays,
  Calculator,
  Camera,
  ChartLine,
  Check,
  ChevronDown,
  ClipboardList,
  Database,
  DollarSign,
  FileText,
  Gauge,
  Globe2,
  Handshake,
  Headphones,
  Heart,
  Image,
  LayoutTemplate,
  Mail,
  MapPinned,
  Megaphone,
  MousePointerClick,
  Package,
  Palette,
  PawPrint,
  PenTool,
  PieChart,
  Plane,
  Plus,
  Presentation,
  ReceiptText,
  RefreshCw,
  Rocket,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Sparkles,
  Target,
  TestTube2,
  Trash2,
  TrendingUp,
  Users,
  Video,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
import { useProviderStore } from '@/stores/providers';
import { useSkillsStore } from '@/stores/skills';
import { useChatStore, type RawMessage } from '@/stores/chat';
import { hostApiFetch } from '@/lib/host-api';
import { subscribeHostEvent } from '@/lib/host-events';
import { CHANNEL_ICONS, CHANNEL_NAMES, type ChannelType } from '@/types/channel';
import type { AgentSummary } from '@/types/agent';
import type { ProviderAccount, ProviderVendorInfo, ProviderWithKeyInfo } from '@/lib/providers';
import { AGENCY_AGENT_CATEGORIES, getAgencyAgentCategory, getAgencyAgentDescription } from '@/lib/agency-agents';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

type AgentsViewMode = 'agency' | 'mine';

function getLocalizedAgentPresentation(
  agent: AgentSummary,
  t: TFunction<'agents'>,
  language: string,
) {
  const category = getAgencyAgentCategory(agent.id);
  const localizedDescription = t(`agencyAgentDescriptions.${agent.id}`, { defaultValue: '' });
  const localizedName = t(`agencyAgentNames.${agent.id}`, { defaultValue: '' });
  const placeholderPattern = /fill this in during your first conversation/i;
  const rawDescription = agent.description && !placeholderPattern.test(agent.description)
    ? agent.description
    : '';
  const sourceDescription = rawDescription || getAgencyAgentDescription(agent.id);
  const isEnglish = language.toLowerCase().startsWith('en');
  const categoryLabel = category ? t(`agencyCategories.${category.id}.label`) : t('agency.uncategorized');
  const description = localizedDescription
    || (!isEnglish && category ? t(`agencyCategories.${category.id}.description`) : sourceDescription)
    || (agent.isDefault ? t('agency.defaultDescription') : t('agency.customDescription'));

  return {
    category,
    categoryLabel,
    description,
    displayName: localizedName || agent.name,
  };
}

const AGENT_ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/ppt|presentation|slide/i, Presentation],
  [/data|database|analysis|analytics|analyst/i, Database],
  [/stock|trend|growth|market|intelligence/i, TrendingUp],
  [/meeting|notes|project|workflow|manager/i, ClipboardList],
  [/daily|briefing|news/i, FileText],
  [/content|summary|summarizer|book|co-author|narratologist|historian/i, BookOpen],
  [/email|mail/i, Mail],
  [/life|companion|psychologist/i, Heart],
  [/wardrobe|stylist|shirt|clothes|outfit/i, Shirt],
  [/career|recruit|job|sales|proposal/i, Briefcase],
  [/travel|trip/i, Plane],
  [/pet|care|zoo/i, PawPrint],
  [/calendar|schedule|cron/i, CalendarDays],
  [/anthropologist|community|inclusive|audience/i, Users],
  [/geographer|localization|cross-border|china/i, MapPinned],
  [/brain|strategy|researcher|search|seo|zhihu|baidu/i, Search],
  [/brand|guardian|compliance|legal|tax|audit/i, ShieldCheck],
  [/image|visual|photo|prompt/i, Image],
  [/ui|ux|interface|design/i, LayoutTemplate],
  [/creative|whimsy|storyteller/i, Sparkles],
  [/bookkeeper|controller|account|payable|fp-a/i, Calculator],
  [/finance|budget|cash|payment/i, DollarSign],
  [/contract|law/i, Scale],
  [/marketing|social|media|douyin|tiktok|weibo|xiaohongshu|linkedin|twitter|instagram|reddit|bilibili|podcast/i, Megaphone],
  [/commerce|e-commerce|store|shop|app-store/i, ShoppingCart],
  [/video|livestream|short-video/i, Video],
  [/support|customer|review|message/i, Headphones],
  [/paid|ad-|ppc|programmatic|campaign/i, Target],
  [/api|tester|qa|test|evidence|reality/i, TestTube2],
  [/performance|benchmark|optimizer/i, Gauge],
  [/tool|ops/i, Wrench],
  [/model/i, Brain],
  [/product|produce|inventory|package/i, Package],
  [/audience|lead/i, Handshake],
  [/chart|dashboard|graph|report/i, ChartLine],
  [/metrics|measurement/i, BarChart3],
  [/global|world/i, Globe2],
  [/invoice|receipt/i, ReceiptText],
  [/launch|rocket/i, Rocket],
  [/camera/i, Camera],
  [/bug|debug/i, Bug],
  [/experiment|research/i, PieChart],
  [/copy|writer|author/i, PenTool],
  [/automation|click/i, MousePointerClick],
  [/default|main/i, Bot],
];

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  efficiency: Gauge,
  life: Heart,
  academic: BookOpen,
  design: Palette,
  finance: DollarSign,
  marketing: Megaphone,
  'paid-media': Target,
  product: Package,
  'project-management': ClipboardList,
  sales: Briefcase,
  specialized: ShieldCheck,
  support: Headphones,
  testing: TestTube2,
};

function getAgentIcon(agent: AgentSummary): LucideIcon {
  const haystack = `${agent.id} ${agent.name} ${agent.description || ''}`;
  for (const [pattern, Icon] of AGENT_ICON_RULES) {
    if (pattern.test(haystack)) {
      return Icon;
    }
  }
  const category = getAgencyAgentCategory(agent.id);
  return category ? (CATEGORY_ICON_MAP[category.id] || Bot) : Bot;
}

function buildAgentIntroMessage(
  agent: AgentSummary,
  t: TFunction<'agents'>,
  language: string,
): RawMessage {
  const presentation = getLocalizedAgentPresentation(agent, t, language);
  const specificIntro = t(`agencyAgentIntros.${agent.id}`, {
    defaultValue: '',
    name: presentation.displayName,
    agentId: agent.id,
    category: presentation.categoryLabel,
    description: presentation.description,
  });
  const content = typeof specificIntro === 'string' && specificIntro.trim()
    ? specificIntro.trim()
    : t('agencyIntro.message', {
      name: presentation.displayName,
      agentId: agent.id,
      category: presentation.categoryLabel,
      description: presentation.description,
    });

  return {
    role: 'assistant',
    content,
    timestamp: Date.now() / 1000,
    id: `local-agent-intro-${agent.id}-${Date.now()}`,
    _localKind: 'agent-intro',
  };
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
  const { t, i18n } = useTranslation('agents');
  const navigate = useNavigate();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const refreshProviderSnapshot = useProviderStore((state) => state.refreshProviderSnapshot);
  const lastGatewayStateRef = useRef(gatewayStatus.state);
  const {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    deleteAgent,
  } = useAgentsStore();
  const [channelGroups, setChannelGroups] = useState<ChannelGroupItem[]>([]);
  const [hasCompletedInitialLoad, setHasCompletedInitialLoad] = useState(() => agents.length > 0);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<AgentsViewMode>('agency');

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
  const agencyAgents = useMemo(
    () => visibleAgents.filter((agent) => getAgencyAgentCategory(agent.id)),
    [visibleAgents],
  );
  const customAgents = useMemo(
    () => visibleAgents.filter((agent) => !agent.isDefault && !getAgencyAgentCategory(agent.id)),
    [visibleAgents],
  );
  const selectedCategory = selectedCategoryId === 'all'
    ? null
    : AGENCY_AGENT_CATEGORIES.find((category) => category.id === selectedCategoryId) ?? null;
  const displayedAgencyAgents = useMemo(
    () => {
      if (viewMode === 'mine') return customAgents;
      if (selectedCategory) {
        return agencyAgents.filter((agent) => getAgencyAgentCategory(agent.id)?.id === selectedCategory.id);
      }
      return agencyAgents;
    },
    [agencyAgents, customAgents, selectedCategory, viewMode],
  );
  const isShowingMyEmployees = viewMode === 'mine';
  const isUsingStableValue = loading && hasCompletedInitialLoad;
  const handleRefresh = () => {
    void Promise.all([fetchAgents(), fetchChannelAccounts()]);
  };

  const handleUseAgent = (agent: AgentSummary) => {
    const chatStore = useChatStore.getState();
    chatStore.newSession(agent.id);
    const introMessage = buildAgentIntroMessage(agent, t, i18n.resolvedLanguage || i18n.language || '');
    const { currentSessionKey } = useChatStore.getState();
    useChatStore.setState((state) => ({
      messages: [introMessage],
      sessionLastActivity: {
        ...state.sessionLastActivity,
        [currentSessionKey]: Date.now(),
      },
    }));
    navigate('/');
  };

  if (loading && !hasCompletedInitialLoad) {
    return (
      <div className="flex flex-col -m-6 dark:bg-background min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div data-testid="agents-page" className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-5xl mx-auto flex flex-col h-full p-10 pt-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 shrink-0 gap-4">
          <div className="min-w-0">
            <h1
              className="text-5xl md:text-6xl font-serif text-foreground mb-3 font-normal tracking-tight"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
            >
              {t('title')}
            </h1>
            <p className="max-w-2xl text-[17px] text-foreground/70 font-medium">{t('subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:mt-2">
            <div
              className="relative flex h-11 rounded-full bg-black/5 p-1 text-[14px] font-semibold text-foreground/70 dark:bg-white/10"
              role="tablist"
              aria-label={t('agency.viewToggleLabel')}
            >
              <span
                className={cn(
                  'absolute top-1 h-9 rounded-full bg-black shadow-sm transition-all duration-200 dark:bg-white',
                  viewMode === 'agency' ? 'left-1 w-[78px]' : 'left-[82px] w-[96px]',
                )}
              />
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'agency'}
                onClick={() => setViewMode('agency')}
                className={cn(
                  'relative z-10 h-9 w-[78px] rounded-full transition-colors',
                  viewMode === 'agency' ? 'text-white dark:text-black' : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {t('agency.recommended')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'mine'}
                onClick={() => setViewMode('mine')}
                className={cn(
                  'relative z-10 h-9 w-[96px] rounded-full transition-colors',
                  viewMode === 'mine' ? 'text-white dark:text-black' : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {t('agency.mine')}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isUsingStableValue && 'animate-spin')} />
              {t('refresh')}
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              {t('addAgent')}
            </Button>
          </div>
        </div>

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

        <div className={cn('mb-4 space-y-4', viewMode === 'mine' && 'hidden')}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={cn(
                'h-9 rounded-full px-4 text-[13px] font-semibold transition-colors',
                selectedCategoryId === 'all'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10',
              )}
            >
              {t('agency.all')}
            </button>
            {AGENCY_AGENT_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={cn(
                  'h-9 rounded-full px-4 text-[13px] font-semibold transition-colors',
                  selectedCategoryId === category.id
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10',
                )}
              >
                {t(`agencyCategories.${category.id}.label`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2">
          {displayedAgencyAgents.length === 0 && isShowingMyEmployees ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-black/15 dark:border-white/15 bg-white dark:bg-card px-6 text-center">
              <h2 className="text-[18px] font-semibold text-foreground">{t('agency.mineEmptyTitle')}</h2>
              <p className="mt-2 max-w-md text-[14px] leading-6 text-foreground/60">{t('agency.mineEmptyDescription')}</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="mt-5 h-9 rounded-full px-5 text-[13px] font-medium shadow-none"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                {t('addAgent')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayedAgencyAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onOpenSettings={() => setActiveAgentId(agent.id)}
                  onDelete={() => setAgentToDelete(agent)}
                  onUse={() => handleUseAgent(agent)}
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
  onOpenSettings,
  onDelete,
  onUse,
}: {
  agent: AgentSummary;
  onOpenSettings: () => void;
  onDelete: () => void;
  onUse: () => void;
}) {
  const { t, i18n } = useTranslation('agents');
  const { description, displayName } = getLocalizedAgentPresentation(
    agent,
    t,
    i18n.resolvedLanguage || i18n.language || '',
  );
  const agentIcon = createElement(getAgentIcon(agent), { className: 'h-[22px] w-[22px]' });

  return (
    <div
      className={cn(
        'group min-h-[230px] rounded-[28px] bg-white dark:bg-card border border-black/15 dark:border-white/15 p-6 text-left relative overflow-hidden',
        agent.isDefault && 'ring-1 ring-black/15 dark:ring-white/15'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 shrink-0 flex items-center justify-center text-foreground bg-black/5 dark:bg-white/[0.08] rounded-full shadow-sm">
              {agentIcon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-[15px] font-semibold text-foreground truncate">{displayName}</h2>
                {agent.isDefault && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] border-0 shadow-none text-foreground/70"
                  >
                    <Check className="h-3 w-3" />
                    {t('defaultBadge')}
                  </Badge>
                )}
              </div>
              <p className="mt-1 font-mono text-[12px] text-foreground/45 truncate">
                {agent.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!agent.isDefault && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                onClick={onDelete}
                title={t('deleteAgent')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
              onClick={onOpenSettings}
              title={t('settings')}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6 flex-1">
          <p className="text-[14px] leading-[1.6] text-foreground/65 line-clamp-3">
            {description}
          </p>
        </div>

        <div className="mt-auto flex justify-end pt-4">
          <Button
            onClick={onUse}
            className="h-8 rounded-full px-5 text-[13px] font-medium bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-none border-0"
          >
            {t('agency.use')}
          </Button>
        </div>
      </div>
    </div>
  );
}
const inputClasses = 'h-[44px] rounded-xl font-mono text-[13px] bg-white dark:bg-muted border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 shadow-sm transition-all text-foreground placeholder:text-foreground/40';
const selectClasses = 'h-[44px] w-full rounded-xl font-mono text-[13px] bg-white dark:bg-muted border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 shadow-sm transition-all text-foreground px-3';
const labelClasses = 'text-[14px] text-foreground/80 font-bold';
const createControlClasses = 'w-full rounded-xl border border-black/10 dark:border-white/10 bg-[#f7f7f7] dark:bg-muted/80 px-3 text-[14px] text-foreground placeholder:text-muted-foreground/65 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 dark:focus-visible:ring-white/20 focus-visible:border-black/20 dark:focus-visible:border-white/20';

interface AddAgentCreateOptions {
  inheritWorkspace?: boolean;
  description: string;
  instructions: string;
  modelRef: string | null;
  skillIds: string[];
}

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
  onCreate: (name: string, options: AddAgentCreateOptions) => Promise<void>;
}) {
  const { t } = useTranslation('agents');
  const defaultModelRef = useAgentsStore((state) => state.defaultModelRef);
  const providerAccounts = useProviderStore((state) => state.accounts);
  const providerStatuses = useProviderStore((state) => state.statuses);
  const providerVendors = useProviderStore((state) => state.vendors);
  const providerDefaultAccountId = useProviderStore((state) => state.defaultAccountId);
  const skills = useSkillsStore((state) => state.skills);
  const skillsLoading = useSkillsStore((state) => state.loading);
  const fetchSkills = useSkillsStore((state) => state.fetchSkills);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedModelRef, setSelectedModelRef] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const maxNameLength = 15;
  const maxDescriptionLength = 100;

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

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

    return entries.map((account) => {
      const runtimeProviderKey = resolveRuntimeProviderKey(account);
      const vendor = vendorMap.get(account.vendorId);
      const configuredModelId = account.model
        ? (account.model.startsWith(`${runtimeProviderKey}/`)
          ? account.model.slice(runtimeProviderKey.length + 1)
          : account.model)
        : vendor?.modelIdPlaceholder;

      return {
        runtimeProviderKey,
        accountId: account.id,
        label: `${account.label} (${vendor?.name || account.vendorId})`,
        modelIdPlaceholder: vendor?.modelIdPlaceholder,
        configuredModelId,
      };
    });
  }, [providerAccounts, providerDefaultAccountId, providerStatuses, providerVendors]);

  const modelOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    if (defaultModelRef) {
      const defaultParsed = splitModelRef(defaultModelRef);
      options.push({
        value: defaultModelRef,
        label: t('createDialog.defaultModelOption', {
          model: defaultParsed?.modelId || defaultModelRef,
        }),
      });
    }

    for (const provider of runtimeProviderOptions) {
      const modelId = provider.configuredModelId || provider.modelIdPlaceholder;
      if (!modelId) continue;
      const value = `${provider.runtimeProviderKey}/${modelId}`;
      if (options.some((option) => option.value === value)) continue;
      options.push({
        value,
        label: `${modelId} · ${provider.label}`,
      });
    }

    if (options.length === 0) {
      options.push({ value: '', label: t('createDialog.systemDefaultModel') });
    }
    return options;
  }, [defaultModelRef, runtimeProviderOptions, t]);

  const effectiveSelectedModelRef = selectedModelRef || modelOptions[0]?.value || '';
  const canCreate = Boolean(name.trim() && description.trim() && instructions.trim());
  const selectableSkills = useMemo(() => (
    skills
      .filter((skill) => !skill.isCore)
      .sort((left, right) => left.name.localeCompare(right.name))
  ), [skills]);
  const selectedSkillNames = selectedSkillIds
    .map((skillId) => selectableSkills.find((skill) => skill.id === skillId)?.name || skillId)
    .filter(Boolean);

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((current) => (
      current.includes(skillId)
        ? current.filter((id) => id !== skillId)
        : [...current, skillId]
    ));
  };

  const handleSubmit = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      await onCreate(name.trim(), {
        inheritWorkspace: false,
        description: description.trim(),
        instructions: instructions.trim(),
        modelRef: effectiveSelectedModelRef && effectiveSelectedModelRef !== defaultModelRef
          ? effectiveSelectedModelRef
          : null,
        skillIds: selectedSkillIds,
      });
    } catch (error) {
      toast.error(t('toast.agentCreateFailed', { error: String(error) }));
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl border-0 bg-white shadow-2xl dark:bg-card">
        <CardContent className="max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-[20px] font-bold tracking-tight text-foreground">
              {t('createDialog.title')}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              aria-label={t('common:actions.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-[13px] font-bold text-foreground/75">
                {t('createDialog.nameLabel')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="agent-name"
                  value={name}
                  maxLength={maxNameLength}
                  onChange={(event) => setName(event.target.value.slice(0, maxNameLength))}
                  placeholder={t('createDialog.namePlaceholder')}
                  className={cn(createControlClasses, 'h-11 pr-16')}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                  {name.length} / {maxNameLength}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-description" className="text-[13px] font-bold text-foreground/75">
                {t('createDialog.shortDescriptionLabel')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <textarea
                  id="agent-description"
                  value={description}
                  maxLength={maxDescriptionLength}
                  onChange={(event) => setDescription(event.target.value.slice(0, maxDescriptionLength))}
                  placeholder={t('createDialog.shortDescriptionPlaceholder')}
                  className={cn(createControlClasses, 'min-h-16 resize-none py-2.5 pr-16 leading-6')}
                />
                <span className="pointer-events-none absolute bottom-2.5 right-3 text-[12px] text-muted-foreground">
                  {description.length} / {maxDescriptionLength}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-instructions" className="text-[13px] font-bold text-foreground/75">
                {t('createDialog.instructionsLabel')} <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="agent-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder={t('createDialog.instructionsPlaceholder')}
                className={cn(createControlClasses, 'min-h-28 resize-none py-3 leading-6')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-model" className="text-[13px] font-bold text-foreground/75">
                {t('createDialog.modelLabel')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="agent-model"
                  value={effectiveSelectedModelRef}
                  onChange={(event) => setSelectedModelRef(event.target.value)}
                  className={cn(createControlClasses, 'h-11 appearance-none pr-10')}
                >
                  {modelOptions.map((option) => (
                    <option key={option.value || 'default'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-skills" className="text-[13px] font-bold text-foreground/75">
                {t('createDialog.skillsLabel')}
              </Label>
              <div className="relative">
                <button
                  type="button"
                  id="agent-skills"
                  onClick={() => setSkillsOpen((open) => !open)}
                  className={cn(
                    createControlClasses,
                    'flex h-11 items-center justify-between gap-3 pr-10 text-left',
                    selectedSkillIds.length === 0 && 'text-muted-foreground',
                  )}
                  aria-expanded={skillsOpen}
                >
                  <span className="truncate">
                    {selectedSkillIds.length > 0
                      ? t('createDialog.skillsSelected', { count: selectedSkillIds.length, names: selectedSkillNames.join(', ') })
                      : t('createDialog.skillsPlaceholder')}
                  </span>
                </button>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                {skillsOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-10 max-h-56 overflow-y-auto rounded-xl border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-card">
                    {skillsLoading ? (
                      <div className="px-3 py-2 text-[13px] text-muted-foreground">
                        {t('createDialog.skillsLoading')}
                      </div>
                    ) : selectableSkills.length === 0 ? (
                      <div className="px-3 py-2 text-[13px] text-muted-foreground">
                        {t('createDialog.skillsEmpty')}
                      </div>
                    ) : (
                      selectableSkills.map((skill) => {
                        const checked = selectedSkillIds.includes(skill.id);
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => toggleSkill(skill.id)}
                            className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            <span className={cn(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-black/20 dark:border-white/20',
                              checked && 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black',
                            )}>
                              {checked && <Check className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-foreground">
                                {skill.name}
                              </span>
                              <span className="block truncate text-[12px] text-muted-foreground">
                                {skill.description || skill.id}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl border-black/15 bg-white text-[14px] font-bold text-foreground shadow-none hover:bg-black/5 dark:border-white/15 dark:bg-card dark:hover:bg-white/10"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving || !canCreate}
              className="h-11 rounded-xl bg-black text-[14px] font-bold text-white shadow-none hover:bg-black/90 disabled:bg-muted-foreground/60 disabled:text-white dark:bg-white dark:text-black dark:hover:bg-white/90 dark:disabled:bg-white/30 dark:disabled:text-white/60"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                t('createDialog.createButton')
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
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border-0 shadow-2xl bg-white dark:bg-card overflow-hidden">
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
                    className="h-[44px] text-[13px] font-medium rounded-xl px-4 border-black/10 dark:border-white/10 bg-white dark:bg-muted hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
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
      <Card className="w-full max-w-xl rounded-3xl border-0 shadow-2xl bg-white dark:bg-card overflow-hidden">
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

export default Agents;
