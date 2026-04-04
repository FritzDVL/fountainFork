import { PublicClient, mainnet, evmAddress, uri } from "@lens-protocol/client";
import { addAppAuthorizationEndpoint, addAppSigners } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chains } from "@lens-chain/sdk/viem";

// ============ FILL THESE IN ============
const BUILDER_PRIVATE_KEY = "0xbc8af3a20e97cc47280036a6a8fbf960d073e0828599af3f551da63eefadfbae";
const APP_ADDRESS = "0x637E685eF29403831dE51A58Bc8230b88549745E";
const AUTH_ENDPOINT = "https://auth.societyprotocol.io/authorize";
const AUTH_SECRET = "0x1998ec8a5029ec33ca99fbb1a892d14c8eb8947428cf8dc23fc999b0c5554f97";
const SIGNER_ADDRESS = "0x574BAadd11b948231883E85d237D299A991371c8";
// =======================================

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
  console.log("✓ Authenticated as Builder");

  console.log("Registering auth endpoint...");
  const endpointResult = await addAppAuthorizationEndpoint(sessionClient, {
    endpoint: uri(AUTH_ENDPOINT),
    app: evmAddress(APP_ADDRESS),
    bearerToken: AUTH_SECRET,
  });

  if (endpointResult.isErr()) {
    console.error("Failed:", endpointResult.error);
    process.exit(1);
  }
  console.log("✓ Auth endpoint registered");

  console.log("Registering app signer...");
  const signerResult = await addAppSigners(sessionClient, {
    app: evmAddress(APP_ADDRESS),
    signers: [evmAddress(SIGNER_ADDRESS)],
  })
    .andThen(handleOperationWith(wallet))
    .andThen(sessionClient.waitForTransaction);

  if (signerResult.isErr()) {
    console.error("Failed:", signerResult.error);
    process.exit(1);
  }
  console.log("✓ App signer registered");

  console.log("\n=== DONE ===");
  console.log("Auth endpoint:", AUTH_ENDPOINT);
  console.log("Signer:", SIGNER_ADDRESS);
}

main();
