import { formatRelativeTime } from "@/lib/utils";
import { ForumPostContent } from "./forum-post-content";
import { OnchainBadge } from "./onchain-badge";
import { HeartButton } from "./heart-button";

interface ForumPostCardProps {
  contentJson: any | null;
  authorUsername: string | null;
  authorAddress: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  position: number;
  isRoot?: boolean;
  title?: string;
  replyButton?: React.ReactNode;
  modActions?: React.ReactNode;
  publicationId?: string;
  contentUri?: string;
}

export function ForumPostCard({
  contentJson,
  authorUsername,
  authorAddress,
  createdAt,
  upvotes,
  position,
  isRoot = false,
  title,
  replyButton,
  modActions,
  publicationId,
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

        {/* Onchain badge — top right */}
        <OnchainBadge publicationId={publicationId} authorUsername={authorUsername} />
      </div>

      {/* Content */}
      {isRoot && title && (
        <div className="text-base font-bold mb-2">{title}</div>
      )}
      <ForumPostContent contentJson={contentJson} />

      {/* Footer: heart + reply + mod */}
      <div className="flex items-center gap-3 mt-4">
        <HeartButton publicationId={publicationId || ""} initialCount={upvotes} />
        {replyButton}
        {modActions}
      </div>
    </div>
  );
}
