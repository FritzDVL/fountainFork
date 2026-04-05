"use client";

import { MessageSquare } from "lucide-react";
import { useComposer } from "@/hooks/forum/use-composer";
import type { FeedType } from "@/lib/forum/constants";

interface ReplyButtonProps {
  rootPublicationId: string;
  feed: FeedType;
  threadTitle: string;
}

export function ReplyButton({ rootPublicationId, feed, threadTitle }: ReplyButtonProps) {
  const { openReply } = useComposer();

  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => openReply({ rootPublicationId, feed, title: threadTitle })}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      Reply
    </button>
  );
}
