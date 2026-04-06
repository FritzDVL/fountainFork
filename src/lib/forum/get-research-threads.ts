import { createClient } from "@/lib/db/server";
import type { ThreadListItem } from "./get-threads";

interface ResearchFilters {
  category?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

interface ResearchResult {
  threads: (ThreadListItem & { tags: string[]; category: string })[];
  total: number;
  allTags: string[];
  categoryCounts: Record<string, number>;
}

export async function getResearchThreads(filters: ResearchFilters = {}): Promise<ResearchResult> {
  const { category, tag, page = 1, pageSize = 20 } = filters;
  const db = await createClient();
  const offset = (page - 1) * pageSize;

  // Build query
  let query = db
    .from("forum_threads")
    .select("*", { count: "exact" })
    .eq("feed", "research")
    .eq("is_hidden", false);

  if (category) query = query.eq("category", category);
  if (tag) query = query.contains("tags", [tag]);

  const { data, count, error } = await query
    .order("is_pinned", { ascending: false })
    .order("last_reply_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  // Fetch category counts + all tags in parallel
  const [countsRes, tagsRes] = await Promise.all([
    db.from("forum_threads").select("category").eq("feed", "research").eq("is_hidden", false),
    db.from("forum_threads").select("tags").eq("feed", "research").eq("is_hidden", false),
  ]);

  const categoryCounts: Record<string, number> = {};
  for (const row of countsRes.data || []) {
    categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
  }

  const tagSet = new Set<string>();
  for (const row of tagsRes.data || []) {
    for (const t of row.tags || []) tagSet.add(t);
  }

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
      tags: t.tags || [],
      category: t.category,
    })),
    total: count || 0,
    allTags: Array.from(tagSet).sort(),
    categoryCounts,
  };
}
