// Lens App
export const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";

// Forum Groups (onchain — open membership)
export const COMMONS_GROUP_ADDRESS = "0xC49d554071dC12498Df4bDCD39E337062c782644";
export const RESEARCH_GROUP_ADDRESS = "0x7f2b18933152DF1c6ded211583c95A739831743d";

// Forum Feeds (onchain — GroupGatedFeedRule)
export const COMMONS_FEED_ADDRESS = "0x3e7EEfaC1cF8Aaf260d045694B2312139f46fd03";
export const RESEARCH_FEED_ADDRESS = "0xb3E74A66c813b79c63Db6A5f13D57ffBDa62D590";

// Admin
export const ADMIN_ADDRESS = "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e";

// Feed type mapping
export const FEED_MAP = {
  commons: COMMONS_FEED_ADDRESS,
  research: RESEARCH_FEED_ADDRESS,
} as const;

export type FeedType = keyof typeof FEED_MAP;
