export interface AgencyAgentCategory {
  id: string;
  agentIds: readonly string[];
}

export const AGENCY_AGENT_CATEGORIES: readonly AgencyAgentCategory[] = [
  {
    id: 'academic',
    agentIds: ['anthropologist', 'geographer', 'historian', 'narratologist', 'psychologist'],
  },
  {
    id: 'design',
    agentIds: ['brand-guardian', 'image-prompt-engineer', 'inclusive-visuals-specialist', 'ui-designer', 'ux-architect', 'ux-researcher', 'visual-storyteller', 'whimsy-injector'],
  },
  {
    id: 'finance',
    agentIds: ['bookkeeper-controller', 'financial-analyst', 'fp-a-analyst', 'investment-researcher', 'tax-strategist'],
  },
  {
    id: 'marketing',
    agentIds: ['agentic-search-optimizer', 'ai-citation-strategist', 'app-store-optimizer', 'baidu-seo-specialist', 'bilibili-content-strategist', 'book-co-author', 'carousel-growth-engine', 'china-e-commerce-operator', 'china-market-localization-strategist', 'content-creator', 'cross-border-e-commerce-specialist', 'douyin-strategist', 'growth-hacker', 'instagram-curator', 'kuaishou-strategist', 'linkedin-content-creator', 'livestream-commerce-coach', 'podcast-strategist', 'private-domain-operator', 'reddit-community-builder', 'seo-specialist', 'short-video-editing-coach', 'social-media-strategist', 'tiktok-strategist', 'twitter-engager', 'video-optimization-specialist', 'wechat-official-account-manager', 'weibo-strategist', 'xiaohongshu-specialist', 'zhihu-strategist'],
  },
  {
    id: 'paid-media',
    agentIds: ['paid-media-auditor', 'ad-creative-strategist', 'paid-social-strategist', 'ppc-campaign-strategist', 'programmatic-display-buyer', 'search-query-analyst', 'tracking-measurement-specialist'],
  },
  {
    id: 'product',
    agentIds: ['behavioral-nudge-engine', 'feedback-synthesizer', 'product-manager', 'sprint-prioritizer', 'trend-researcher'],
  },
  {
    id: 'project-management',
    agentIds: ['experiment-tracker', 'jira-workflow-steward', 'project-shepherd', 'studio-operations', 'studio-producer', 'senior-project-manager'],
  },
  {
    id: 'sales',
    agentIds: ['account-strategist', 'sales-coach', 'deal-strategist', 'discovery-coach', 'sales-engineer', 'outbound-strategist', 'pipeline-analyst', 'proposal-strategist'],
  },
  {
    id: 'specialized',
    agentIds: ['accounts-payable-agent', 'agentic-identity-trust-architect', 'agents-orchestrator', 'automation-governance-architect', 'blockchain-security-auditor', 'compliance-auditor', 'corporate-training-designer', 'customer-service', 'data-consolidation-agent', 'government-digital-presales-consultant', 'healthcare-customer-service', 'healthcare-marketing-compliance-specialist', 'hospitality-guest-services', 'hr-onboarding', 'identity-graph-operator', 'language-translator', 'legal-billing-time-tracking', 'legal-client-intake', 'legal-document-review', 'loan-officer-assistant', 'lsp-index-engineer', 'real-estate-buyer-seller', 'recruitment-specialist', 'report-distribution-agent', 'retail-customer-returns', 'sales-data-extraction-agent', 'sales-outreach', 'chief-of-staff', 'civil-engineer', 'cultural-intelligence-strategist', 'developer-advocate', 'document-generator', 'french-consulting-market-navigator', 'korean-business-navigator', 'mcp-builder', 'model-qa-specialist', 'salesforce-architect', 'workflow-architect', 'study-abroad-advisor', 'supply-chain-strategist', 'zk-steward'],
  },
  {
    id: 'support',
    agentIds: ['analytics-reporter', 'executive-summary-generator', 'finance-tracker', 'infrastructure-maintainer', 'legal-compliance-checker', 'support-responder'],
  },
  {
    id: 'testing',
    agentIds: ['accessibility-auditor', 'api-tester', 'evidence-collector', 'performance-benchmarker', 'reality-checker', 'test-results-analyzer', 'tool-evaluator', 'workflow-optimizer'],
  },
];

const AGENCY_AGENT_CATEGORY_BY_ID = new Map<string, AgencyAgentCategory>(
  AGENCY_AGENT_CATEGORIES.flatMap((category) => category.agentIds.map((agentId) => [agentId, category] as const)),
);

export function getAgencyAgentCategory(agentId: string): AgencyAgentCategory | null {
  return AGENCY_AGENT_CATEGORY_BY_ID.get(agentId) ?? null;
}

/** Per-agent description overrides; falls back to category description. */
const AGENCY_AGENT_DESCRIPTIONS: Record<string, string> = {
  // Add specific agent descriptions here when available.
};

export function getAgencyAgentDescription(agentId: string): string | null {
  const specific = AGENCY_AGENT_DESCRIPTIONS[agentId];
  return specific ?? null;
}
