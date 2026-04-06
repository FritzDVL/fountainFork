"use client";

import { Heart } from "lucide-react";
import { useForumHeart } from "@/hooks/forum/use-forum-heart";

interface HeartButtonProps {
  publicationId: string;
  initialCount: number;
}

export function HeartButton({ publicationId, initialCount }: HeartButtonProps) {
  const { count, hasHearted, isLoading, toggleHeart } = useForumHeart({
    publicationId,
    initialCount,
  });

  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 text-sm transition-colors ${
        hasHearted
          ? "text-red-500"
          : "text-muted-foreground hover:text-red-500"
      }`}
      onClick={toggleHeart}
      disabled={isLoading}
    >
      <Heart className={`h-4 w-4 ${hasHearted ? "fill-current" : ""}`} />
      {count > 0 && <span className="text-xs">{count}</span>}
    </button>
  );
}
