import { PublicClient, mainnet, evmAddress } from "@lens-protocol/client";
import { joinGroup } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chains } from "@lens-chain/sdk/viem";

const BUILDER_PRIVATE_KEY = "0xbc8af3a20e97cc47280036a6a8fbf960d073e0828599af3f551da63eefadfbae";
const COMMONS_GROUP = "0x724CCb155b813b8a21E7C452167d22828871c7E1";
const RESEARCH_GROUP = "0x73D8A1c03C3e5a7686295574f4Fce2F08ea908B8";
const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";
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

  // Login as Account Owner WITH the app context
  console.log("Logging in as Account Owner (with app)...");
  const userAuth = await client.login({
    accountOwner: {
      account: evmAddress(MY_ACCOUNT),
      app: evmAddress(APP_ADDRESS),
      owner: account.address,
    },
    signMessage: (message) => account.signMessage({ message }),
  });

  if (userAuth.isErr()) {
    console.error("Auth failed:", userAuth.error);
    process.exit(1);
  }
  const session = userAuth.value;
  console.log("✓ Authenticated\n");

  // Try joining with explicit rule params
  for (const [name, groupAddr] of [["Commons", COMMONS_GROUP], ["Research", RESEARCH_GROUP]] as const) {
    console.log(`Joining ${name} Group...`);

    // First check if we can join
    const result = await joinGroup(session, {
      group: evmAddress(groupAddr),
    });

    if (result.isErr()) {
      console.log(`  Join mutation result: ${result.error}`);

      // Try handling as transaction
      console.log(`  Trying with wallet signing...`);
      const result2 = await joinGroup(session, {
        group: evmAddress(groupAddr),
      })
        .andThen(handleOperationWith(wallet))

      if (result2.isErr()) {
        console.log(`  With wallet: ${result2.error}`);
      } else {
        console.log(`  ✓ Joined ${name} (with wallet)`);
      }
    } else {
      console.log(`  Raw result:`, JSON.stringify(result.value, null, 2));
    }
  }

  console.log("\n=== DONE ===");
}

main();
