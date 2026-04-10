import { evmAddress } from "@lens-protocol/client";
import { joinGroup } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { COMMONS_GROUP_ADDRESS } from "./constants";
import type { FeedType } from "./constants";

const GROUP_MAP: Partial<Record<FeedType, string>> = {
  commons: COMMONS_GROUP_ADDRESS,
};

export async function ensureGroupMembership(
  lens: any,
  feed: FeedType,
  walletClient: any,
): Promise<{ ok: boolean; error?: string }> {
  const groupAddress = GROUP_MAP[feed];
  if (!groupAddress) return { ok: true }; // research or unknown — skip auto-join

  try {
    const result = await joinGroup(lens, { group: evmAddress(groupAddress) })
      .andThen(handleOperationWith(walletClient))
      .andThen(lens.waitForTransaction);

    if (result.isErr()) {
      // "already a member" errors are fine
      const errStr = String(result.error);
      if (errStr.includes("already") || errStr.includes("member")) return { ok: true };
      return { ok: true }; // try posting anyway — might already be a member
    }
    return { ok: true };
  } catch {
    return { ok: true }; // don't block posting on join failure
  }
}
