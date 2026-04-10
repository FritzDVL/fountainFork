"use client";

import { useState, useEffect } from "react";
import { useWalletClient } from "wagmi";
import { evmAddress } from "@lens-protocol/client";
import { joinGroup } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { toast } from "sonner";
import { getLensClient } from "@/lib/lens/client";
import { RESEARCH_GROUP_ADDRESS } from "@/lib/forum/constants";

export function ResearchJoinButton({ onJoined, openNewThread }: { onJoined?: () => void; openNewThread: () => void }) {
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    fetch("/api/forum/membership")
      .then((r) => r.json())
      .then((d) => setIsMember(d.isMember))
      .catch(() => setIsMember(false));
  }, []);

  if (isMember === null) return null;

  if (isMember) {
    return (
      <button
        type="button"
        onClick={openNewThread}
        className="inline-flex items-center h-8 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        + New Topic
      </button>
    );
  }

  const handleJoin = async () => {
    if (!walletClient) {
      toast.error("Please connect your wallet");
      return;
    }
    setJoining(true);
    const pending = toast.loading("Joining research group...");
    try {
      const lens = await getLensClient();
      if (!lens.isSessionClient()) {
        toast.dismiss(pending);
        toast.error("Please log in first");
        setJoining(false);
        return;
      }
      const result = await joinGroup(lens, { group: evmAddress(RESEARCH_GROUP_ADDRESS) })
        .andThen(handleOperationWith(walletClient))
        .andThen(lens.waitForTransaction);

      toast.dismiss(pending);
      if (result.isErr()) {
        const err = String(result.error);
        if (err.includes("already") || err.includes("member")) {
          setIsMember(true);
          toast.success("You're already a member!");
        } else {
          toast.error(`Failed to join: ${result.error}`);
        }
      } else {
        setIsMember(true);
        toast.success("Joined research group!");
        onJoined?.();
      }
    } catch (e: any) {
      toast.dismiss(pending);
      toast.error(e.message || "Failed to join");
    } finally {
      setJoining(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={joining}
      className="inline-flex items-center h-8 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {joining ? "Joining..." : "🔒 Join to Post"}
    </button>
  );
}
