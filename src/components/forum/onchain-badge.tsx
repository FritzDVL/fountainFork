"use client";

import Link from "next/link";

interface OnchainBadgeProps {
  publicationId?: string;
  authorUsername?: string;
}

export function OnchainBadge({ publicationId, authorUsername }: OnchainBadgeProps) {
  const isOnchain = publicationId && !publicationId.startsWith("test-");

  // Link to the standalone publication page (Fountain's article view)
  // This page shows: full content, Grove hash, tipping, metadata
  const publicationUrl = isOnchain && authorUsername
    ? `/p/${authorUsername}/${publicationId}`
    : undefined;

  if (!isOnchain) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-transparent">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        <span>Pending</span>
      </span>
    );
  }

  return (
    <Link
      href={publicationUrl || "#"}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-500 border border-green-500/30 hover:bg-green-500/25 transition-all"
      title="View as standalone publication"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
      </svg>
      <span>Onchain</span>
    </Link>
  );
}
