"use client";

import type { FeedType } from "@/lib/forum/constants";

interface ThreadRef {
  rootPublicationId: string;
  feed: FeedType;
  title: string;
}

interface ComposerHeaderProps {
  mode: "thread" | "reply";
  title: string;
  onTitleChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  threadRef?: ThreadRef;
}

export function ComposerHeader({
  mode,
  title,
  onTitleChange,
  threadRef,
}: ComposerHeaderProps) {
  if (mode === "reply" && threadRef) {
    return (
      <div className="px-4 py-2 border-b text-sm text-muted-foreground shrink-0">
        Replying to: <span className="font-medium text-foreground">{threadRef.title}</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-b shrink-0">
      <input
        type="text"
        placeholder="Thread title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
