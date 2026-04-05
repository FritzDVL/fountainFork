import type { FeedType } from "./constants";

export interface Category {
  slug: string;
  name: string;
  description: string;
  section: string;
  feed: FeedType;
  displayOrder: number;
}

export interface Section {
  id: string;
  title: string;
  feed: FeedType;
  layout: "list" | "grid";
  categories: Category[];
}

// ============================================
// COMMONS BOARDS — shown on /boards landing page
// ============================================

export const LANDING_SECTIONS: Section[] = [
  {
    id: "general",
    title: "General Discussion",
    feed: "commons",
    layout: "list",
    categories: [
      { slug: "beginners", name: "Beginners & Help", description: "New to the forum? Start here.", section: "general", feed: "commons", displayOrder: 1 },
      { slug: "key-concepts", name: "4 Key Concepts", description: "Core concepts and fundamental principles.", section: "general", feed: "commons", displayOrder: 2 },
      { slug: "web3-outpost", name: "Web3 Outpost", description: "Web3 integration, badges, and specs.", section: "general", feed: "commons", displayOrder: 3 },
      { slug: "dao-governance", name: "DAO Governance", description: "Governance discussions and proposals.", section: "general", feed: "commons", displayOrder: 4 },
    ],
  },
  {
    id: "functions",
    title: "Functions (Value System)",
    feed: "research",
    layout: "grid",
    categories: [
      { slug: "game-theory", name: "Economic Game Theory", description: "Economic models and game theory.", section: "functions", feed: "research", displayOrder: 9 },
      { slug: "function-ideas", name: "Function Ideas", description: "Propose and discuss new functions.", section: "functions", feed: "research", displayOrder: 10 },
      { slug: "hunting", name: "Hunting", description: "Resource discovery strategies.", section: "functions", feed: "research", displayOrder: 11 },
      { slug: "property", name: "Property", description: "Property rights and ownership.", section: "functions", feed: "research", displayOrder: 12 },
      { slug: "parenting", name: "Parenting", description: "Community growth and mentorship.", section: "functions", feed: "research", displayOrder: 13 },
      { slug: "governance-func", name: "Governance", description: "Decision-making structures.", section: "functions", feed: "research", displayOrder: 14 },
      { slug: "organizations", name: "Organizations", description: "Organizational design.", section: "functions", feed: "research", displayOrder: 15 },
      { slug: "curation", name: "Curation", description: "Content and quality curation.", section: "functions", feed: "research", displayOrder: 16 },
      { slug: "farming", name: "Farming", description: "Value creation strategies.", section: "functions", feed: "research", displayOrder: 17 },
      { slug: "portal", name: "Portal", description: "Gateway and integration.", section: "functions", feed: "research", displayOrder: 18 },
      { slug: "communication", name: "Communication", description: "Communication protocols.", section: "functions", feed: "research", displayOrder: 19 },
    ],
  },
  {
    id: "others",
    title: "Others",
    feed: "commons",
    layout: "list",
    categories: [
      { slug: "meta", name: "Meta-discussion", description: "About the forum itself.", section: "others", feed: "commons", displayOrder: 26 },
      { slug: "politics", name: "Politics & Society", description: "Political impacts on society.", section: "others", feed: "commons", displayOrder: 27 },
      { slug: "economics", name: "Economics", description: "Economic models and theories.", section: "others", feed: "commons", displayOrder: 28 },
      { slug: "crypto-web3", name: "Cryptocurrencies & Web3", description: "The broader crypto landscape.", section: "others", feed: "commons", displayOrder: 29 },
      { slug: "off-topic", name: "Off-topic", description: "Anything unrelated to the protocol.", section: "others", feed: "commons", displayOrder: 30 },
    ],
  },
  {
    id: "partners",
    title: "Partner Communities",
    feed: "commons",
    layout: "list",
    categories: [
      { slug: "partners-general", name: "General Discussion", description: "Partner community discussions.", section: "partners", feed: "commons", displayOrder: 5 },
      { slug: "announcements", name: "Announcements", description: "Official partner news and updates.", section: "partners", feed: "commons", displayOrder: 6 },
      { slug: "network-states", name: "Network States", description: "Current and upcoming network states.", section: "partners", feed: "commons", displayOrder: 7 },
      { slug: "partner-badges", name: "Partner Badges & SPEC", description: "Badge systems for partners.", section: "partners", feed: "commons", displayOrder: 8 },
    ],
  },
];

// ============================================
// RESEARCH CATEGORIES — shown on /research page (Phase 8)
// These are the "Technical Section" categories
// ============================================

export const RESEARCH_SECTIONS: Section[] = [
  {
    id: "technical",
    title: "Society Protocol Technical Section",
    feed: "research",
    layout: "list",
    categories: [
      { slug: "architecture", name: "General Architecture", description: "System architecture and design.", section: "technical", feed: "research", displayOrder: 20 },
      { slug: "state-machine", name: "State Machine", description: "State transitions and logic.", section: "technical", feed: "research", displayOrder: 21 },
      { slug: "consensus", name: "Consensus (Proof of Hunt)", description: "Consensus mechanisms.", section: "technical", feed: "research", displayOrder: 22 },
      { slug: "cryptography", name: "Cryptography", description: "Cryptographic primitives.", section: "technical", feed: "research", displayOrder: 23 },
      { slug: "account-system", name: "Account System", description: "Accounts and identity.", section: "technical", feed: "research", displayOrder: 24 },
      { slug: "security", name: "Security", description: "Security protocols.", section: "technical", feed: "research", displayOrder: 25 },
    ],
  },
];

// ============================================
// ALL SECTIONS combined (for lookups)
// ============================================

export const SECTIONS: Section[] = [...LANDING_SECTIONS, ...RESEARCH_SECTIONS];
export const ALL_CATEGORIES = SECTIONS.flatMap((s) => s.categories);
export const getCategoryBySlug = (slug: string) => ALL_CATEGORIES.find((c) => c.slug === slug);
export const getCategoriesByFeed = (feed: FeedType) => ALL_CATEGORIES.filter((c) => c.feed === feed);
export const getCategoriesBySection = (sectionId: string) => SECTIONS.find((s) => s.id === sectionId)?.categories ?? [];

// ============================================
// LANGUAGE BOARDS — static data for landing page
// These will later come from forum_communities table
// ============================================

export interface LanguageBoard {
  flag: string;
  name: string;
  members: number;
  description: string;
}

export const LANGUAGE_BOARDS: LanguageBoard[] = [
  { flag: "🇪🇸", name: "Español", members: 42, description: "Comunidad hispanohablante del protocolo." },
  { flag: "🇧🇷", name: "Português", members: 18, description: "Comunidade lusófona do protocolo." },
  { flag: "🇨🇳", name: "中文", members: 7, description: "中文社区讨论协议相关话题。" },
];
