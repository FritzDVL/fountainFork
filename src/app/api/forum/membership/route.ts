import { NextResponse } from "next/server";
import { evmAddress } from "@lens-protocol/client";
import { fetchGroupMembers } from "@lens-protocol/client/actions";
import { getLensClient } from "@/lib/lens/client";
import { RESEARCH_GROUP_ADDRESS } from "@/lib/forum/constants";
import { getUserAccount } from "@/lib/auth/get-user-profile";

export async function GET() {
  const { address } = await getUserAccount();
  if (!address) return NextResponse.json({ isMember: false });

  const lens = await getLensClient();
  const members = await fetchGroupMembers(lens, {
    group: evmAddress(RESEARCH_GROUP_ADDRESS),
  }).unwrapOr(null);

  const isMember = members?.items.some((m) => m.account.address === address) ?? false;
  return NextResponse.json({ isMember });
}
