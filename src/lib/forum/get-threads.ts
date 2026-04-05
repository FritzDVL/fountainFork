import { createClient } from "@/lib/db/server";

export interface ThreadListItem {
  id: string;
  rootPublicationId: string;
  title: string;
  summary: string | null;
  authorUsername: string | null;
  authorAddress: string;
  replyCount: number;
  viewsCount: number;
  upvotes: number;
  downvotes: number;
  lastReplyAt: string | null;
  createdAt: string;
  isPinned: boolean;
  isLocked: boolean;
}

export async function getThreadsByCategory(
  category: string,
  page = 1,
  pageSize = 20,
): Promise<{ threads: ThreadListItem[]; total: number }> {
  const db = await createClient();
  const offset = (page - 1) * pageSize;

  const { data, count, error } = await db
    .from("forum_threads")
    .select("*", { count: "exact" })
    .eq("category", category)
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return {
    threads: (data || []).map((t: any) => ({
      id: t.id,
      rootPublicationId: t.root_publication_id,
      title: t.title,
      summary: t.summary,
      authorUsername: t.author_username,
      authorAddress: t.author_address,
      replyCount: t.reply_count,
      viewsCount: t.views_count,
      upvotes: t.upvotes,
      downvotes: t.downvotes,
      lastReplyAt: t.last_reply_at,
      createdAt: t.created_at,
      isPinned: t.is_pinned,
      isLocked: t.is_locked,
    })),
    total: count || 0,
  };
}
