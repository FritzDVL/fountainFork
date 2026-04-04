import { PublicClient, mainnet, evmAddress } from "@lens-protocol/client";
import { joinGroup, approveGroupMembershipRequests } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chains } from "@lens-chain/sdk/viem";

const BUILDER_PRIVATE_KEY = "0xbc8af3a20e97cc47280036a6a8fbf960d073e0828599af3f551da63eefadfbae";

const COMMONS_GROUP = "0x724CCb155b813b8a21E7C452167d22828871c7E1";
const RESEARCH_GROUP = "0x73D8A1c03C3e5a7686295574f4Fce2F08ea908B8";
const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";

// Your Lens account address
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

  // Step 1: Login as Account Owner to send join requests
  console.log("Logging in as Account Owner...");
  const userAuth = await client.login({
    accountOwner: {
      account: evmAddress(MY_ACCOUNT),
      app: evmAddress(APP_ADDRESS),
      owner: account.address,
    },
    signMessage: (message) => account.signMessage({ message }),
  });

  if (userAuth.isErr()) {
    console.error("User auth failed:", userAuth.error);
    process.exit(1);
  }
  const userSession = userAuth.value;
  console.log("✓ Logged in as Account Owner\n");

  // Step 2: Join both groups (sends join request)
  for (const [name, groupAddr] of [["Commons", COMMONS_GROUP], ["Research", RESEARCH_GROUP]] as const) {
    console.log(`Requesting to join ${name} Group...`);
    const joinResult = await joinGroup(userSession, {
      group: evmAddress(groupAddr),
    })
      .andThen(handleOperationWith(wallet))
      .andThen(userSession.waitForTransaction);

    if (joinResult.isErr()) {
      console.log(`  Note: ${joinResult.error} (may already be a member)`);
    } else {
      console.log(`  ✓ Join request sent for ${name}`);
    }
  }

  // Step 3: Login as Builder to approve
  console.log("\nLogging in as Builder...");
  const builderAuth = await client.login({
    builder: { address: account.address },
    signMessage: (message) => account.signMessage({ message }),
  });

  if (builderAuth.isErr()) {
    console.error("Builder auth failed:", builderAuth.error);
    process.exit(1);
  }
  const builderSession = builderAuth.value;
  console.log("✓ Logged in as Builder\n");

  // Step 4: Approve in both groups
  for (const [name, groupAddr] of [["Commons", COMMONS_GROUP], ["Research", RESEARCH_GROUP]] as const) {
    console.log(`Approving membership in ${name} Group...`);
    const approveResult = await approveGroupMembershipRequests(builderSession, {
      group: evmAddress(groupAddr),
      accounts: [evmAddress(MY_ACCOUNT)],
    })
      .andThen(handleOperationWith(wallet))
      .andThen(builderSession.waitForTransaction);

    if (approveResult.isErr()) {
      console.log(`  Note: ${approveResult.error} (may already be approved)`);
    } else {
      console.log(`  ✓ Approved in ${name} Group`);
    }
  }

  console.log("\n=== DONE ===");
}

main();
