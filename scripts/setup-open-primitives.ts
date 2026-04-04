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

const BUILDER_PRIVATE_KEY = "0xbc8af3a20e97cc47280036a6a8fbf960d073e0828599af3f551da63eefadfbae";
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
  if (authenticated.isErr()) { console.error("Auth failed:", authenticated.error); process.exit(1); }
  const sessionClient = authenticated.value;
  console.log("✓ Authenticated\n");

  // Commons Group — NO membership approval rule
  console.log("Creating Commons Group (open)...");
  const cgMeta = group({ name: "Society-Commons-Open", description: "General discussion — open membership." });
  const cgUri = await uploadMetadata(cgMeta);
  const cgResult = await createGroup(sessionClient, {
    metadataUri: uri(cgUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));
  if (cgResult.isErr()) { console.error("Failed:", cgResult.error); process.exit(1); }
  console.log("✓ Commons Group:", cgResult.value.address);

  // Research Group — NO membership approval rule
  console.log("Creating Research Group (open)...");
  const rgMeta = group({ name: "Society-Research-Open", description: "Technical research — open membership." });
  const rgUri = await uploadMetadata(rgMeta);
  const rgResult = await createGroup(sessionClient, {
    metadataUri: uri(rgUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchGroup(sessionClient, { txHash }));
  if (rgResult.isErr()) { console.error("Failed:", rgResult.error); process.exit(1); }
  console.log("✓ Research Group:", rgResult.value.address);

  // Commons Feed — gated to new Commons Group
  console.log("Creating Commons Feed...");
  const cfMeta = feed({ name: "Society Commons Open", description: "General discussion feed." });
  const cfUri = await uploadMetadata(cfMeta);
  const cfResult = await createFeed(sessionClient, {
    metadataUri: uri(cfUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
    rules: { required: [{ groupGatedRule: { group: evmAddress(cgResult.value.address) } }] },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));
  if (cfResult.isErr()) { console.error("Failed:", cfResult.error); process.exit(1); }
  console.log("✓ Commons Feed:", cfResult.value.address);

  // Research Feed — gated to new Research Group
  console.log("Creating Research Feed...");
  const rfMeta = feed({ name: "Society Research Open", description: "Technical research feed." });
  const rfUri = await uploadMetadata(rfMeta);
  const rfResult = await createFeed(sessionClient, {
    metadataUri: uri(rfUri),
    admins: [evmAddress(ADMIN_ADDRESS)],
    rules: { required: [{ groupGatedRule: { group: evmAddress(rgResult.value.address) } }] },
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction)
    .andThen((txHash) => fetchFeed(sessionClient, { txHash }));
  if (rfResult.isErr()) { console.error("Failed:", rfResult.error); process.exit(1); }
  console.log("✓ Research Feed:", rfResult.value.address);

  // Register with app
  console.log("\nRegistering with app...");
  await addAppFeeds(sessionClient, {
    app: evmAddress(APP_ADDRESS),
    feeds: [evmAddress(cfResult.value.address), evmAddress(rfResult.value.address)],
  }).andThen(handleOperationWith(wallet)).andThen(sessionClient.waitForTransaction);
  console.log("✓ Feeds registered");

  await addAppGroups(sessionClient, {
    app: evmAddress(APP_ADDRESS),
    groups: [evmAddress(cgResult.value.address), evmAddress(rgResult.value.address)],
  }).andThen(handleOperationWith(wallet)).andThen(sessionClient.waitForTransaction);
  console.log("✓ Groups registered");

  console.log("\n========================================");
  console.log("NEW ADDRESSES (replace the old ones):");
  console.log("========================================");
  console.log(`COMMONS_GROUP_ADDRESS  = "${cgResult.value.address}"`);
  console.log(`RESEARCH_GROUP_ADDRESS = "${rgResult.value.address}"`);
  console.log(`COMMONS_FEED_ADDRESS   = "${cfResult.value.address}"`);
  console.log(`RESEARCH_FEED_ADDRESS  = "${rfResult.value.address}"`);
  console.log("========================================");
}

main();
