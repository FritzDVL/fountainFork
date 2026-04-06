"use client";

import { useCallback, useState } from "react";
import { PostReactionType } from "@lens-protocol/client";
import { addReaction, undoReaction } from "@lens-protocol/client/actions";
import { useAuthenticatedUser } from "@lens-protocol/react";
import { getLensClient } from "@/lib/lens/client";
import { toast } from "sonner";

interface UseForumHeartProps {
  publicationId: string;
  initialCount: number;
  initialHasHearted?: boolean;
}

export function useForumHeart({ publicationId, initialCount, initialHasHearted = false }: UseForumHeartProps) {
  const [count, setCount] = useState(initialCount);
  const [hasHearted, setHasHearted] = useState(initialHasHearted);
  const [isLoading, setIsLoading] = useState(false);
  const { data: user } = useAuthenticatedUser();

  const toggleHeart = useCallback(async () => {
    if (!user) {
      toast.error("Please log in to react");
      return;
    }

    // Skip for test data
    if (publicationId.startsWith("test-")) {
      toast.error("Cannot react to test data");
      return;
    }

    // Optimistic update
    const wasHearted = hasHearted;
    const prevCount = count;
    setHasHearted(!wasHearted);
    setCount(wasHearted ? Math.max(0, prevCount - 1) : prevCount + 1);

    setIsLoading(true);
    try {
      const lens = await getLensClient();
      if (!lens.isSessionClient()) return;

      if (wasHearted) {
        await undoReaction(lens, { post: publicationId, reaction: PostReactionType.Upvote });
      } else {
        await addReaction(lens, { post: publicationId, reaction: PostReactionType.Upvote });
      }
    } catch (err) {
      // Revert on error
      setHasHearted(wasHearted);
      setCount(prevCount);
      console.error("Reaction failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicationId, hasHearted, count, user]);

  return { count, hasHearted, isLoading, toggleHeart };
}
