import { PublicClient, mainnet, evmAddress } from "@lens-protocol/client";
import { fetchGroup, fetchFeed, joinGroup, approveGroupMembershipRequests } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chains } from "@lens-chain/sdk/viem";

// ============ FILL THIS IN ============
const BUILDER_PRIVATE_KEY = "0xbc8af3a20e97cc47280036a6a8fbf960d073e0828599af3f551da63eefadfbae";
// =======================================

const COMMONS_GROUP = "0x724CCb155b813b8a21E7C452167d22828871c7E1";
const RESEARCH_GROUP = "0x73D8A1c03C3e5a7686295574f4Fce2F08ea908B8";
const COMMONS_FEED = "0x43cF2ECc67D02d6F262Ed789de98f1950AAF8a2C";
const RESEARCH_FEED = "0x0eC9c71e865a8690D5285B278320a251331d6321";

// Your Lens account address (the one you log in with)
const MY_ACCOUNT = "0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931";

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

  // Authenticate as Builder
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
  // VERIFY: Fetch Groups and Feeds
  // =========================================
  console.log("=== VERIFICATION ===");

  const cg = await fetchGroup(sessionClient, { group: evmAddress(COMMONS_GROUP) });
  console.log("T2.1 Commons Group:", cg.isOk() ? `✓ ${cg.value?.metadata?.name}` : `✗ ${cg.error}`);

  const rg = await fetchGroup(sessionClient, { group: evmAddress(RESEARCH_GROUP) });
  console.log("T2.2 Research Group:", rg.isOk() ? `✓ ${rg.value?.metadata?.name}` : `✗ ${rg.error}`);

  const cf = await fetchFeed(sessionClient, { feed: evmAddress(COMMONS_FEED) });
  console.log("T2.3 Commons Feed:", cf.isOk() ? `✓ ${cf.value?.metadata?.name}` : `✗ ${cf.error}`);

  const rf = await fetchFeed(sessionClient, { feed: evmAddress(RESEARCH_FEED) });
  console.log("T2.4 Research Feed:", rf.isOk() ? `✓ ${rf.value?.metadata?.name}` : `✗ ${rf.error}`);

  // =========================================
  // APPROVE: Join + approve self in both groups
  // =========================================
  console.log("\n=== MEMBER APPROVAL ===");

  // We need to login as the account owner to join
  // But as Builder we can approve directly since we're admin
  // First try to approve (in case join request already exists or we can directly add)

  for (const [name, groupAddr] of [["Commons", COMMONS_GROUP], ["Research", RESEARCH_GROUP]] as const) {
    console.log(`\nApproving ${MY_ACCOUNT} in ${name} Group...`);
    const approveResult = await approveGroupMembershipRequests(sessionClient, {
      group: evmAddress(groupAddr),
      members: [evmAddress(MY_ACCOUNT)],
    })
      .andThen(handleOperationWith(wallet))
      .andThen(sessionClient.waitForTransaction);

    if (approveResult.isErr()) {
      console.log(`  Note: ${approveResult.error}`);
      console.log(`  (This may mean the account needs to joinGroup first, or is already a member)`);
    } else {
      console.log(`  ✓ Approved in ${name} Group`);
    }
  }

  console.log("\n=== DONE ===");
}

main();
