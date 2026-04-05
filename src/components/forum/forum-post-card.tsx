import { Heart } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { ForumPostContent } from "./forum-post-content";

interface ForumPostCardProps {
  contentJson: any | null;
  authorUsername: string | null;
  authorAddress: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  position: number;
  isRoot?: boolean;
}

export function ForumPostCard({
  contentJson,
  authorUsername,
  authorAddress,
  createdAt,
  upvotes,
  position,
  isRoot = false,
}: ForumPostCardProps) {
  return (
    <div className="border-b py-6 first:pt-0 last:border-b-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            {(authorUsername || authorAddress)?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="text-sm font-medium">
              {authorUsername || `${authorAddress.slice(0, 6)}...${authorAddress.slice(-4)}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {isRoot ? "Original post" : `Reply #${position}`}
              {" · "}
              {formatRelativeTime(createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ForumPostContent contentJson={contentJson} />

      {/* Heart reaction (static for now — wired in Phase 7) */}
      <div className="flex items-center gap-1.5 mt-4 text-sm text-muted-foreground">
        <button className="hover:text-red-500 transition-colors" type="button">
          <Heart className="h-4 w-4" />
        </button>
        {upvotes > 0 && <span className="text-xs">{upvotes}</span>}
      </div>
    </div>
  );
}
