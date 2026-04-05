import { PublicClient, mainnet, evmAddress } from "@lens-protocol/client";
import { joinGroup } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chains } from "@lens-chain/sdk/viem";

const BUILDER_PRIVATE_KEY = "0xbc8af3a20e97cc47280036a6a8fbf960d073e0828599af3f551da63eefadfbae";
const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";
const MY_ACCOUNT = "0x8aE18FfF977aCc6Dc690C288a61004a7c7D5A931";
const COMMONS_GROUP = "0xC49d554071dC12498Df4bDCD39E337062c782644";
const RESEARCH_GROUP = "0x7f2b18933152DF1c6ded211583c95A739831743d";

async function main() {
  const account = privateKeyToAccount(BUILDER_PRIVATE_KEY as `0x${string}`);
  const wallet = createWalletClient({ account, chain: chains.mainnet, transport: http() });

  const client = PublicClient.create({ environment: mainnet, origin: "https://forum.societyprotocol.io" });

  // Login as Account Owner (not Builder — need to join as the account)
  console.log("Logging in as Account Owner...");
  const auth = await client.login({
    accountOwner: {
      account: evmAddress(MY_ACCOUNT),
      app: evmAddress(APP_ADDRESS),
      owner: account.address,
    },
    signMessage: (message) => account.signMessage({ message }),
  });

  if (auth.isErr()) { console.error("Auth failed:", auth.error); process.exit(1); }
  const session = auth.value;
  console.log("✓ Authenticated\n");

  for (const [name, addr] of [["Commons", COMMONS_GROUP], ["Research", RESEARCH_GROUP]] as const) {
    console.log(`Joining ${name} Group (${addr})...`);
    const result = await joinGroup(session, { group: evmAddress(addr) })
      .andThen(handleOperationWith(wallet))
      .andThen(session.waitForTransaction);

    if (result.isErr()) {
      console.log(`  ${result.error} (may already be a member)`);
    } else {
      console.log(`  ✓ Joined ${name}`);
    }
  }

  console.log("\n=== DONE ===");
}

main();
