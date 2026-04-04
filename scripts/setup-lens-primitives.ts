import { PublicClient, mainnet, evmAddress, uri } from "@lens-protocol/client";
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
import { chains } from "@lens-chain/sdk/viem";
import { group, feed } from "@lens-protocol/metadata";
import { StorageClient, immutable } from "@lens-chain/storage-client";

// ============ FILL THIS IN ============
const BUILDER_PRIVATE_KEY = "0xbc8af3a20e97cc47280036a6a8fbf960d073e0828599af3f551da63eefadfbae";
// =======================================
const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";
const ADMIN_ADDRESS = "0xc93947ed78d87bdeb232d9c29c07fd0e8cf0a43e";

const storageClient = StorageClient.create();

async function uploadMetadata(data: object): Promise<string> {
  const acl = immutable(chains.mainnet.id);
  const { uri } = await storageClient.uploadAsJson(data, { acl });
  return uri;
}

async function main() {
  const account = privateKeyToAccount(BUILDER_PRIVATE_KEY as `0x${string}`);
  const wallet = createWalletClient({
    account,
    chain: chains.mainnet,
    transport: http(),
  });

  const client = PublicClient.create({
    environment: mainnet,
    origin: "https://forum.societyprotocol.io",
  });

  console.log("Authenticating as Builder...");
  const authenticated = await client.login({
    builder: { address: account.address },
    signMessage: (message) => account.signMessage({ message }),
  });

  if (authenticated.isErr()) {
    console.error("Auth failed:", authenticated.error);
    process.exit(1);
  }
  const sessionClient = authenticated.value;
  console.log("✓ Authenticated\n");

  // =========================================
  // STEP 1: Create Commons Group
  // =========================================
  console.log("Creating Commons Group...");
  const commonsGroupMeta = group({
    name: "Society-Commons",
    description: "General discussion community for Society Protocol.",
  });
  const commonsGroupUri = await uploadMetadata(commonsGroupMeta);

  const commonsGroupResult = await createGroup(sessionClient, {
    metadataUri: uri(commonsGroupUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
    rules: {
      required: [{ membershipApprovalRule: { enable: true } }],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));

  if (commonsGroupResult.isErr()) {
    console.error("Failed:", commonsGroupResult.error);
    process.exit(1);
  }
  const commonsGroup = commonsGroupResult.value;
  console.log("✓ Commons Group:", commonsGroup.address);

  // =========================================
  // STEP 2: Create Research Group
  // =========================================
  console.log("Creating Research Group...");
  const researchGroupMeta = group({
    name: "Society-Research",
    description: "Technical research community for Society Protocol.",
  });
  const researchGroupUri = await uploadMetadata(researchGroupMeta);

  const researchGroupResult = await createGroup(sessionClient, {
    metadataUri: uri(researchGroupUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
    rules: {
      required: [{ membershipApprovalRule: { enable: true } }],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));

  if (researchGroupResult.isErr()) {
    console.error("Failed:", researchGroupResult.error);
    process.exit(1);
  }
  const researchGroup = researchGroupResult.value;
  console.log("✓ Research Group:", researchGroup.address);

  // =========================================
  // STEP 3: Create Commons Feed (gated to Commons Group)
  // =========================================
  console.log("Creating Commons Feed...");
  const commonsFeedMeta = feed({
    name: "Society Commons",
    description: "General discussion feed for Society Protocol.",
  });
  const commonsFeedUri = await uploadMetadata(commonsFeedMeta);

  const commonsFeedResult = await createFeed(sessionClient, {
    metadataUri: uri(commonsFeedUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
    rules: {
      required: [
        { groupGatedRule: { group: evmAddress(commonsGroup.address) } },
      ],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));

  if (commonsFeedResult.isErr()) {
    console.error("Failed:", commonsFeedResult.error);
    process.exit(1);
  }
  const commonsFeed = commonsFeedResult.value;
  console.log("✓ Commons Feed:", commonsFeed.address);

  // =========================================
  // STEP 4: Create Research Feed (gated to Research Group)
  // =========================================
  console.log("Creating Research Feed...");
  const researchFeedMeta = feed({
    name: "Society Research",
    description: "Technical research feed for Society Protocol.",
  });
  const researchFeedUri = await uploadMetadata(researchFeedMeta);

  const researchFeedResult = await createFeed(sessionClient, {
    metadataUri: uri(researchFeedUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
    rules: {
      required: [
        { groupGatedRule: { group: evmAddress(researchGroup.address) } },
      ],
    },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));

  if (researchFeedResult.isErr()) {
    console.error("Failed:", researchFeedResult.error);
    process.exit(1);
  }
  const researchFeed = researchFeedResult.value;
  console.log("✓ Research Feed:", researchFeed.address);

  // =========================================
  // STEP 5: Register Feeds with App
  // =========================================
  console.log("\nRegistering feeds with app...");
  const addFeedsResult = await addAppFeeds(sessionClient, {
    app: evmAddress(APP_ADDRESS),
    feeds: [
      evmAddress(commonsFeed.address),
      evmAddress(researchFeed.address),
    ],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (addFeedsResult.isErr()) {
    console.error("Failed:", addFeedsResult.error);
    process.exit(1);
  }
  console.log("✓ Feeds registered with app");

  // =========================================
  // STEP 6: Register Groups with App
  // =========================================
  console.log("Registering groups with app...");
  const addGroupsResult = await addAppGroups(sessionClient, {
    app: evmAddress(APP_ADDRESS),
    groups: [
      evmAddress(commonsGroup.address),
      evmAddress(researchGroup.address),
    ],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (addGroupsResult.isErr()) {
    console.error("Failed:", addGroupsResult.error);
    process.exit(1);
  }
  console.log("✓ Groups registered with app");

  // =========================================
  // OUTPUT
  // =========================================
  console.log("\n========================================");
  console.log("SAVE THESE ADDRESSES:");
  console.log("========================================");
  console.log(`COMMONS_GROUP_ADDRESS  = "${commonsGroup.address}"`);
  console.log(`RESEARCH_GROUP_ADDRESS = "${researchGroup.address}"`);
  console.log(`COMMONS_FEED_ADDRESS   = "${commonsFeed.address}"`);
  console.log(`RESEARCH_FEED_ADDRESS  = "${researchFeed.address}"`);
  console.log("========================================");
}

main();
