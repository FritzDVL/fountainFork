"use client";

import { getCategoriesByFeed } from "@/lib/forum/categories";
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
  tags: string[];
  onTagsChange: (v: string[]) => void;
  isResearch: boolean;
  threadRef?: ThreadRef;
  availableTags?: string[];
}

export function ComposerHeader({
  mode,
  title,
  onTitleChange,
  category,
  onCategoryChange,
  tags,
  onTagsChange,
  isResearch,
  threadRef,
  availableTags = [],
}: ComposerHeaderProps) {
  if (mode === "reply" && threadRef) {
    return (
      <div className="px-4 py-3 border-b bg-muted/20 text-sm shrink-0">
        <span className="text-muted-foreground">Replying to </span>
        <span className="font-semibold">{threadRef.title}</span>
      </div>
    );
  }

  const researchCategories = isResearch ? getCategoriesByFeed("research").filter(c => c.section === "technical") : [];

  return (
    <div className="px-4 py-3 border-b shrink-0 space-y-2">
      <input
        type="text"
        placeholder="Give your thread a title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm font-semibold outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      />
      {isResearch && (
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-muted/50 border border-border rounded-md px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
          >
            <option value="">Select category…</option>
            {researchCategories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val && !tags.includes(val)) onTagsChange([...tags, val]);
            }}
            className="bg-muted/50 border border-border rounded-md px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer"
          >
            <option value="">Add tag…</option>
            {availableTags.filter((t) => !tags.includes(t)).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}
      {isResearch && tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground border border-border">
              #{t}
              <button type="button" onClick={() => onTagsChange(tags.filter((x) => x !== t))} className="hover:text-foreground">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
