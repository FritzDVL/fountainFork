"use client";

import { MessageSquare } from "lucide-react";
import { useComposer } from "@/hooks/forum/use-composer";
import type { FeedType } from "@/lib/forum/constants";

interface ReplyButtonProps {
  rootPublicationId: string;
  feed: FeedType;
  threadTitle: string;
  quotedText?: string;
  quotedAuthor?: string;
  quotedPosition?: number;
}

export function ReplyButton({ rootPublicationId, feed, threadTitle, quotedText, quotedAuthor, quotedPosition }: ReplyButtonProps) {
  const { openReply } = useComposer();

  const handleClick = () => {
    // Build quote attribution
    let fullQuote: string | undefined;
    if (quotedText) {
      const attribution = quotedAuthor
        ? `— @${quotedAuthor}${quotedPosition !== undefined ? `, #${quotedPosition}` : ""}`
        : "";
      fullQuote = `${quotedText}\n${attribution}`;
    }

    openReply({ rootPublicationId, feed, title: threadTitle }, fullQuote);
  };

  return (
    <button
      type="button"
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      onClick={handleClick}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      Reply
    </button>
  );
}
