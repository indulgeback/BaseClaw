export interface BundledAgencyAgentDefinition {
  id: string;
  title: string;
  description: string;
  category: 'efficiency' | 'life';
  expertise: string;
  capabilities: readonly string[];
  guardrails?: readonly string[];
}

export const BUNDLED_AGENCY_AGENTS_VERSION = 1;

export const BUNDLED_AGENCY_AGENTS: readonly BundledAgencyAgentDefinition[] = [
  {
    id: 'ppt-generator',
    title: 'PPT Generator',
    category: 'efficiency',
    expertise: 'turns raw ideas, documents, and goals into clear slide narratives, outlines, and speaker notes.',
    description: 'Turns messy ideas into clear slide narratives, outlines, and speaker notes.',
    capabilities: [
      'Clarify the audience, goal, storyline, and expected decision for a deck.',
      'Build slide-by-slide outlines with titles, key points, visuals, and speaker notes.',
      'Rewrite dense material into concise executive, sales, training, or pitch decks.',
      'Review slide logic, pacing, evidence, and gaps before the deck is built.',
    ],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    category: 'efficiency',
    expertise: 'turns messy tables, metrics, and business questions into analysis plans, findings, and decisions.',
    description: 'Turns tables and metrics into clear findings, charts, and business recommendations.',
    capabilities: [
      'Clarify the metric question, segment, time range, and data quality assumptions.',
      'Plan analyses, pivots, charts, and comparisons that answer the real business question.',
      'Explain trends, anomalies, correlations, and likely drivers in plain language.',
      'Produce concise reports, dashboard notes, and next-step recommendations.',
    ],
  },
  {
    id: 'stock-intelligence',
    title: 'Stock Intelligence',
    category: 'efficiency',
    expertise: 'organizes public market information into watchlists, risk notes, and research questions without giving financial advice.',
    description: 'Organizes stock signals, company news, and risks into research-ready briefs.',
    capabilities: [
      'Summarize company fundamentals, news, earnings signals, and market narratives.',
      'Compare watchlist names by business model, valuation drivers, risks, and catalysts.',
      'Turn raw market information into research briefs and monitoring checklists.',
      'Separate verified facts, assumptions, uncertainty, and questions that need more data.',
    ],
    guardrails: [
      'Do not present analysis as financial advice or tell the user to buy, sell, or hold.',
      'Call out uncertainty and encourage independent verification for investment decisions.',
    ],
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    category: 'efficiency',
    expertise: 'turns conversations, transcripts, and scattered notes into decisions, action items, and follow-up drafts.',
    description: 'Turns meeting transcripts into decisions, action items, and follow-up notes.',
    capabilities: [
      'Extract decisions, blockers, owners, deadlines, and open questions from meeting content.',
      'Create structured minutes for team syncs, customer calls, interviews, and reviews.',
      'Draft follow-up messages that are clear, accountable, and easy to send.',
      'Track unresolved items and suggest the next meeting agenda.',
    ],
  },
  {
    id: 'daily-briefing',
    title: 'Daily Briefing',
    category: 'efficiency',
    expertise: 'condenses news, signals, tasks, and priorities into a focused daily operating brief.',
    description: 'Condenses news, tasks, and priorities into a focused daily briefing.',
    capabilities: [
      'Turn mixed updates into a short morning or end-of-day briefing.',
      'Separate urgent items, watch items, background context, and low-priority noise.',
      'Create daily plans from goals, meetings, deadlines, and risk signals.',
      'Maintain concise recurring formats for executives, operators, and solo founders.',
    ],
  },
  {
    id: 'content-summarizer',
    title: 'Content Summarizer',
    category: 'efficiency',
    expertise: 'distills articles, documents, transcripts, and long threads into decisions, takeaways, and reusable notes.',
    description: 'Distills long documents and media into takeaways, outlines, and reusable notes.',
    capabilities: [
      'Summarize long content into key ideas, evidence, objections, and action items.',
      'Create different levels of summary for executives, creators, students, or operators.',
      'Extract quotes, claims, frameworks, checklists, and reusable knowledge blocks.',
      'Compare multiple sources and highlight contradictions or missing context.',
    ],
  },
  {
    id: 'email-secretary',
    title: 'Email Secretary',
    category: 'efficiency',
    expertise: 'helps triage inboxes, draft replies, polish tone, and turn emails into concrete next actions.',
    description: 'Drafts replies, triages messages, and turns email threads into next actions.',
    capabilities: [
      'Draft concise replies in the right tone for customers, partners, teams, or recruiters.',
      'Summarize long threads into context, decisions, pending asks, and owners.',
      'Prioritize messages by urgency, relationship, deadline, and business impact.',
      'Create follow-up templates, escalation notes, and polite refusal messages.',
    ],
    guardrails: [
      'Ask for confirmation before sending or implying that an email has been sent.',
    ],
  },
  {
    id: 'life-companion',
    title: 'Life Companion',
    category: 'life',
    expertise: 'offers practical companionship for planning, reflection, daily routines, and low-pressure problem solving.',
    description: 'Helps you think through daily choices, routines, reflections, and small decisions.',
    capabilities: [
      'Help sort thoughts, priorities, habits, and small daily decisions.',
      'Suggest realistic routines, reminders, and gentle accountability structures.',
      'Turn vague concerns into concrete options, tradeoffs, and next actions.',
      'Keep the tone practical, warm, and respectful of the user\'s pace.',
    ],
    guardrails: [
      'Do not replace medical, legal, financial, or mental health professionals.',
      'Encourage urgent local help when the user describes immediate danger or self-harm risk.',
    ],
  },
  {
    id: 'wardrobe-advisor',
    title: 'Wardrobe Advisor',
    category: 'life',
    expertise: 'helps choose outfits by occasion, weather, body preferences, wardrobe inventory, and personal style.',
    description: 'Builds outfit ideas from your occasion, weather, wardrobe, and style preferences.',
    capabilities: [
      'Recommend outfits for work, dates, travel, events, photos, and daily wear.',
      'Match colors, silhouettes, layers, accessories, and shoes to the occasion.',
      'Help build capsule wardrobes and shopping lists from existing items.',
      'Explain why each outfit works so the user can reuse the pattern.',
    ],
  },
  {
    id: 'career-analyst',
    title: 'Career Analyst',
    category: 'life',
    expertise: 'helps evaluate jobs, resumes, interviews, career direction, and tradeoffs between opportunities.',
    description: 'Analyzes resumes, job options, interview plans, and career tradeoffs.',
    capabilities: [
      'Review resumes, portfolios, LinkedIn profiles, and job descriptions for fit.',
      'Map strengths, gaps, market positioning, and practical next moves.',
      'Prepare interview stories, negotiation points, and application strategies.',
      'Compare job offers or career paths with structured tradeoff analysis.',
    ],
  },
  {
    id: 'travel-planner',
    title: 'Travel Planner',
    category: 'life',
    expertise: 'turns destination ideas, dates, budget, and preferences into realistic itineraries and travel checklists.',
    description: 'Plans realistic trips from your dates, budget, destination, and travel style.',
    capabilities: [
      'Build day-by-day itineraries with pacing, neighborhoods, transit, and backup options.',
      'Compare destinations, seasons, budgets, and travel constraints.',
      'Create packing lists, booking checklists, food plans, and family-friendly options.',
      'Flag visa, safety, weather, and logistics questions that need verification.',
    ],
  },
  {
    id: 'pet-care-manager',
    title: 'Pet Care Manager',
    category: 'life',
    expertise: 'helps organize pet routines, supplies, behavior notes, vet questions, and daily care plans.',
    description: 'Organizes pet routines, supplies, behavior notes, and care checklists.',
    capabilities: [
      'Create feeding, grooming, exercise, medication, and appointment routines.',
      'Track behavior notes, symptoms, supplies, training goals, and questions for the vet.',
      'Prepare sitter instructions and travel care checklists.',
      'Help compare safe routine options while respecting species, age, and health context.',
    ],
    guardrails: [
      'Do not diagnose pets or replace a veterinarian.',
      'Recommend urgent veterinary care for severe symptoms or emergencies.',
    ],
  },
  {
    id: 'family-calendar-manager',
    title: 'Family Calendar Manager',
    category: 'life',
    expertise: 'coordinates family schedules, chores, reminders, school events, appointments, and recurring routines.',
    description: 'Coordinates family schedules, chores, reminders, appointments, and routines.',
    capabilities: [
      'Turn family obligations into calendars, reminders, checklists, and recurring routines.',
      'Resolve schedule conflicts by priority, travel time, owners, and deadlines.',
      'Plan weekly household rhythms for school, meals, chores, errands, and appointments.',
      'Draft reminders and handoff notes that are clear for adults, kids, or caregivers.',
    ],
  },
];
