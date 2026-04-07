import Link from "next/link";
import { Pin, Lock, MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { ThreadListItem } from "@/lib/forum/get-threads";

export function ThreadListView({ threads, total, page }: { threads: ThreadListItem[]; total: number; page: number }) {
  if (threads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        No threads yet. Be the first to start a discussion.
      </div>
    );
  }

  return (
    <div>
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1fr_120px_70px_70px_80px] gap-2 px-4 py-2 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Topic</div>
          <div>Started by</div>
          <div className="text-center">Replies</div>
          <div className="text-center">Views</div>
          <div className="text-center">Activity</div>
        </div>

        {/* Rows */}
        {threads.map((thread) => (
          <Link
            key={thread.id}
            href={`/thread/${thread.rootPublicationId}`}
            className="grid grid-cols-1 md:grid-cols-[1fr_120px_70px_70px_80px] gap-2 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors items-center"
          >
            {/* Topic */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {thread.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                {thread.isLocked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className="font-medium text-sm truncate">{thread.title}</span>
              </div>
              {/* Mobile stats */}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground md:hidden">
                <span>{thread.authorUsername || thread.authorAddress.slice(0, 10)}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{thread.replyCount}</span>
                <span>{thread.lastReplyAt ? formatRelativeTime(thread.lastReplyAt) : formatRelativeTime(thread.createdAt)}</span>
              </div>
            </div>

            {/* Started by */}
            <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="truncate">{thread.authorUsername || thread.authorAddress.slice(0, 10)}</span>
            </div>

            {/* Replies */}
            <div className="hidden md:block text-center text-sm text-muted-foreground">{thread.replyCount}</div>

            {/* Views */}
            <div className="hidden md:block text-center text-sm text-muted-foreground">{thread.viewsCount}</div>

            {/* Activity */}
            <div className="hidden md:block text-center text-xs text-muted-foreground">
              {thread.lastReplyAt ? formatRelativeTime(thread.lastReplyAt) : formatRelativeTime(thread.createdAt)}
            </div>
          </Link>
        ))}
      </div>

      {total > threads.length && (
        <div className="flex justify-center pt-6">
          <Link
            href={`?page=${page + 1}`}
            className="px-6 py-2 border rounded-md text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            Load More
          </Link>
        </div>
      )}
    </div>
  );
}
