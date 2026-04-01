# Part 2: Lens Primitives — Groups & Feeds

## Goal

Create the 2 Groups and 2 Feeds that form the onchain structure of the forum,
register them with the Lens App, and define the category map. By the end of
this part, you have 2 group-gated feeds ready to receive publications.

---

## Prerequisites

- Part 1 complete (auth endpoint working, Builder auth confirmed)
- Access to the Builder wallet (PRIVATE_KEY in .env.local)
- Grove storage client configured (fountain fork already has this)
- `@lens-protocol/client` and `@lens-protocol/metadata` installed

---

## What Gets Created Onchain

```
Lens App (0x637E...)
├── Commons Group    ← NEW (MembershipApprovalGroupRule)
├── Research Group   ← NEW (MembershipApprovalGroupRule)
├── Commons Feed     ← NEW (GroupGatedFeedRule → Commons Group)
└── Research Feed    ← NEW (GroupGatedFeedRule → Research Group)
```

Each is a separate smart contract deployed to Lens Chain.
The script creates all 4 in sequence, then registers them with the app.

---

## Step 1: Create the Setup Script

Create `scripts/setup-lens-primitives.ts` in the forum app repo (or the
current Web3Forum repo — wherever you have Builder auth working).

This is a ONE-TIME script. Run it once, save the addresses, never run again.

```ts
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  PublicClient,
  mainnet,
  evmAddress,
  uri,
} from "@lens-protocol/client";
import {
  createGroup,
  createFeed,
  addAppFeeds,
  addAppGroups,
  fetchGroup,
  fetchFeed,
} from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { lens } from "viem/chains";
import { group, feed } from "@lens-protocol/metadata";
import { StorageClient, immutable } from "@lens-chain/storage-client";
import { chains } from "@lens-chain/sdk/viem";

// --- Load .env.local ---
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match)
    process.env[match[1].trim()] = match[2]
      .trim()
      .replace(/^["']|["']$/g, "");
}

// --- Config ---
const APP = "0x637E685eF29403831dE51A58Bc8230b88549745E";
const ADMIN = "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e";

// --- Helpers ---
const storageClient = StorageClient.create();
const acl = immutable(chains.mainnet.id);

async function uploadMetadata(data: object): Promise<string> {
  const { uri: metaUri } = await storageClient.uploadAsJson(data, { acl });
  return metaUri;
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("PRIVATE_KEY not found");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const wallet = createWalletClient({
    account,
    chain: lens,
    transport: http(),
  });

  const client = PublicClient.create({
    environment: mainnet,
    origin: "https://lensforum.xyz/",
  });

  // Authenticate as Builder
  const challenge = await client.challenge({
    builder: { address: account.address },
  });
  if (challenge.isErr()) {
    console.error("Challenge failed:", challenge.error);
    process.exit(1);
  }
  const signature = await account.signMessage({
    message: challenge.value.text,
  });
  const auth = await client.authenticate({
    id: challenge.value.id,
    signature,
  });
  if (auth.isErr()) {
    console.error("Auth failed:", auth.error);
    process.exit(1);
  }
  const sessionClient = auth.value;
  console.log("Authenticated as Builder\n");

  // =========================================
  // STEP A: Create Commons Group
  // =========================================
  console.log("Creating Commons Group...");

  const commonsGroupMeta = group({
    name: "Society-Commons",
    description:
      "General discussion community for Society Protocol. Covers governance, partners, web3, and open topics.",
  });
  const commonsGroupUri = await uploadMetadata(commonsGroupMeta);

  const commonsGroupResult = await createGroup(sessionClient, {
    metadataUri: uri(commonsGroupUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [{ membershipApprovalRule: { enable: true } }],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));

  if (commonsGroupResult.isErr()) {
    console.error("Failed to create Commons Group:", commonsGroupResult.error);
    process.exit(1);
  }
  const commonsGroup = commonsGroupResult.value;
  console.log("✓ Commons Group:", commonsGroup.address);

  // =========================================
  // STEP B: Create Research Group
  // =========================================
  console.log("Creating Research Group...");

  const researchGroupMeta = group({
    name: "Society-Research",
    description:
      "Technical research community for Society Protocol. Architecture, cryptography, game theory, and protocol functions.",
  });
  const researchGroupUri = await uploadMetadata(researchGroupMeta);

  const researchGroupResult = await createGroup(sessionClient, {
    metadataUri: uri(researchGroupUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [{ membershipApprovalRule: { enable: true } }],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));

  if (researchGroupResult.isErr()) {
    console.error(
      "Failed to create Research Group:",
      researchGroupResult.error,
    );
    process.exit(1);
  }
  const researchGroup = researchGroupResult.value;
  console.log("✓ Research Group:", researchGroup.address);

  // =========================================
  // STEP C: Create Commons Feed (gated to Commons Group)
  // =========================================
  console.log("Creating Commons Feed...");

  const commonsFeedMeta = feed({
    name: "Society Commons",
    description:
      "General discussion feed for Society Protocol community members.",
  });
  const commonsFeedUri = await uploadMetadata(commonsFeedMeta);

  const commonsFeedResult = await createFeed(sessionClient, {
    metadataUri: uri(commonsFeedUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [
        {
          groupGatedRule: {
            group: evmAddress(commonsGroup.address),
          },
        },
      ],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));

  if (commonsFeedResult.isErr()) {
    console.error("Failed to create Commons Feed:", commonsFeedResult.error);
    process.exit(1);
  }
  const commonsFeed = commonsFeedResult.value;
  console.log("✓ Commons Feed:", commonsFeed.address);

  // =========================================
  // STEP D: Create Research Feed (gated to Research Group)
  // =========================================
  console.log("Creating Research Feed...");

  const researchFeedMeta = feed({
    name: "Society Research",
    description:
      "Technical research feed for Society Protocol. Architecture, consensus, cryptography.",
  });
  const researchFeedUri = await uploadMetadata(researchFeedMeta);

  const researchFeedResult = await createFeed(sessionClient, {
    metadataUri: uri(researchFeedUri),
    admins: [evmAddress(ADMIN)],
    rules: {
      required: [
        {
          groupGatedRule: {
            group: evmAddress(researchGroup.address),
          },
        },
      ],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));

  if (researchFeedResult.isErr()) {
    console.error("Failed to create Research Feed:", researchFeedResult.error);
    process.exit(1);
  }
  const researchFeed = researchFeedResult.value;
  console.log("✓ Research Feed:", researchFeed.address);

  // =========================================
  // STEP E: Register Feeds with App
  // =========================================
  console.log("\nRegistering feeds with app...");

  const addFeedsResult = await addAppFeeds(sessionClient, {
    app: evmAddress(APP),
    feeds: [
      evmAddress(commonsFeed.address),
      evmAddress(researchFeed.address),
    ],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (addFeedsResult.isErr()) {
    console.error("Failed to register feeds:", addFeedsResult.error);
    process.exit(1);
  }
  console.log("✓ Feeds registered with app");

  // =========================================
  // STEP F: Register Groups with App
  // =========================================
  console.log("Registering groups with app...");

  const addGroupsResult = await addAppGroups(sessionClient, {
    app: evmAddress(APP),
    groups: [
      evmAddress(commonsGroup.address),
      evmAddress(researchGroup.address),
    ],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (addGroupsResult.isErr()) {
    console.error("Failed to register groups:", addGroupsResult.error);
    process.exit(1);
  }
  console.log("✓ Groups registered with app");

  // =========================================
  // OUTPUT — Save these addresses!
  // =========================================
  console.log("\n========================================");
  console.log("SAVE THESE ADDRESSES IN YOUR CONSTANTS:");
  console.log("========================================");
  console.log(`COMMONS_GROUP_ADDRESS  = "${commonsGroup.address}"`);
  console.log(`RESEARCH_GROUP_ADDRESS = "${researchGroup.address}"`);
  console.log(`COMMONS_FEED_ADDRESS   = "${commonsFeed.address}"`);
  console.log(`RESEARCH_FEED_ADDRESS  = "${researchFeed.address}"`);
  console.log("========================================\n");
}

main();
```

---

## Step 2: Run the Script

```bash
npx tsx scripts/setup-lens-primitives.ts
```

The script will output 4 addresses. Save them immediately.

Example output:
```
Authenticated as Builder

Creating Commons Group...
✓ Commons Group: 0xABC123...
Creating Research Group...
✓ Research Group: 0xDEF456...
Creating Commons Feed...
✓ Commons Feed: 0x789GHI...
Creating Research Feed...
✓ Research Feed: 0xJKL012...

Registering feeds with app...
✓ Feeds registered with app
Registering groups with app...
✓ Groups registered with app

========================================
SAVE THESE ADDRESSES IN YOUR CONSTANTS:
========================================
COMMONS_GROUP_ADDRESS  = "0xABC123..."
RESEARCH_GROUP_ADDRESS = "0xDEF456..."
COMMONS_FEED_ADDRESS   = "0x789GHI..."
RESEARCH_FEED_ADDRESS  = "0xJKL012..."
========================================
```

---

## Step 3: Add Addresses to App Constants

In the fountain fork, create a constants file:

```ts
// src/lib/forum/constants.ts

// Lens App
export const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";

// Forum Groups (onchain — MembershipApprovalGroupRule)
export const COMMONS_GROUP_ADDRESS = "0xABC123...";  // paste from script output
export const RESEARCH_GROUP_ADDRESS = "0xDEF456..."; // paste from script output

// Forum Feeds (onchain — GroupGatedFeedRule)
export const COMMONS_FEED_ADDRESS = "0x789GHI...";   // paste from script output
export const RESEARCH_FEED_ADDRESS = "0xJKL012...";  // paste from script output

// Admin
export const ADMIN_ADDRESS = "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e";

// Feed type mapping
export const FEED_MAP = {
  commons: COMMONS_FEED_ADDRESS,
  research: RESEARCH_FEED_ADDRESS,
} as const;

export type FeedType = keyof typeof FEED_MAP;
```

---

## Step 4: Define the Category Map

Create the category configuration that replaces the 26 feeds:

```ts
// src/lib/forum/categories.ts

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

export const SECTIONS: Section[] = [
  {
    id: "general",
    title: "GENERAL DISCUSSION",
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
    id: "partners",
    title: "PARTNER COMMUNITIES",
    feed: "commons",
    layout: "list",
    categories: [
      { slug: "partners-general", name: "General Discussion", description: "Partner community discussions.", section: "partners", feed: "commons", displayOrder: 5 },
      { slug: "announcements", name: "Announcements", description: "Official partner news and updates.", section: "partners", feed: "commons", displayOrder: 6 },
      { slug: "network-states", name: "Network States", description: "Current and upcoming network states.", section: "partners", feed: "commons", displayOrder: 7 },
      { slug: "partner-badges", name: "Partner Badges & SPEC", description: "Badge systems for partners.", section: "partners", feed: "commons", displayOrder: 8 },
    ],
  },
  {
    id: "functions",
    title: "FUNCTIONS (VALUE SYSTEM)",
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
    id: "technical",
    title: "SOCIETY PROTOCOL TECHNICAL SECTION",
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
  {
    id: "others",
    title: "OTHERS",
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
];

// Flat lookup helpers
export const ALL_CATEGORIES = SECTIONS.flatMap((s) => s.categories);
export const getCategoryBySlug = (slug: string) =>
  ALL_CATEGORIES.find((c) => c.slug === slug);
export const getCategoriesByFeed = (feed: FeedType) =>
  ALL_CATEGORIES.filter((c) => c.feed === feed);
export const getCategoriesBySection = (sectionId: string) =>
  SECTIONS.find((s) => s.id === sectionId)?.categories ?? [];
```

---

## Step 5: Verify Onchain State

After running the script, verify everything is correct:

### 5.1 Check groups exist
```ts
import { fetchGroup } from "@lens-protocol/client/actions";

const commons = await fetchGroup(client, {
  group: evmAddress(COMMONS_GROUP_ADDRESS),
});
console.log("Commons Group:", commons.value?.metadata?.name);
// Should print: "Society-Commons"

const research = await fetchGroup(client, {
  group: evmAddress(RESEARCH_GROUP_ADDRESS),
});
console.log("Research Group:", research.value?.metadata?.name);
// Should print: "Society-Research"
```

### 5.2 Check feeds exist and are gated
```ts
import { fetchFeed } from "@lens-protocol/client/actions";

const commonsFeed = await fetchFeed(client, {
  feed: evmAddress(COMMONS_FEED_ADDRESS),
});
console.log("Commons Feed:", commonsFeed.value?.metadata?.name);
console.log("Rules:", commonsFeed.value?.rules);
// Should show groupGatedRule pointing to Commons Group

const researchFeed = await fetchFeed(client, {
  feed: evmAddress(RESEARCH_FEED_ADDRESS),
});
console.log("Research Feed:", researchFeed.value?.metadata?.name);
console.log("Rules:", researchFeed.value?.rules);
// Should show groupGatedRule pointing to Research Group
```

### 5.3 Test posting (should fail without group membership)
Try posting to the Commons Feed without being a member of the Commons Group.
It should be rejected by the GroupGatedFeedRule. This confirms gating works.

### 5.4 Approve yourself as a member
```ts
import { joinGroup, approveGroupMembershipRequests } from "@lens-protocol/client/actions";

// First, request to join (as your regular account)
await joinGroup(userSessionClient, {
  group: evmAddress(COMMONS_GROUP_ADDRESS),
});

// Then, approve (as admin/Builder)
await approveGroupMembershipRequests(adminSessionClient, {
  group: evmAddress(COMMONS_GROUP_ADDRESS),
  members: [evmAddress(YOUR_ACCOUNT_ADDRESS)],
});
```

After approval, posting to the Commons Feed should succeed.

---

## Step 6: Approve Initial Members

For each person who should have access to the forum, they need to:
1. Request to join the group (via `joinGroup`)
2. Be approved by an admin (via `approveGroupMembershipRequests`)

For the initial launch, approve yourself and any co-founders/moderators.
The UI for member management will be built in Part 7.

---

## Checklist — Part 2 Complete When:

- [ ] Setup script created and tested
- [ ] Commons Group created onchain with MembershipApprovalGroupRule
- [ ] Research Group created onchain with MembershipApprovalGroupRule
- [ ] Commons Feed created onchain with GroupGatedFeedRule → Commons Group
- [ ] Research Feed created onchain with GroupGatedFeedRule → Research Group
- [ ] Both feeds registered with the Lens App
- [ ] Both groups registered with the Lens App
- [ ] 4 addresses saved in constants file
- [ ] Category map defined (30 categories across 5 sections)
- [ ] Verified: posting without group membership is rejected
- [ ] Verified: posting after approval succeeds
- [ ] At least 1 member (yourself) approved in both groups

---

## Addresses Reference (After Running Script)

Update this section with actual addresses after running:

```
COMMONS_GROUP_ADDRESS  = "0x________________"
RESEARCH_GROUP_ADDRESS = "0x________________"
COMMONS_FEED_ADDRESS   = "0x________________"
RESEARCH_FEED_ADDRESS  = "0x________________"
```

---

## Next: Part 3 — Database Schema

With the onchain primitives in place, Part 3 designs the Supabase tables
that cache thread structure, categories, and forum metadata for fast reads.
