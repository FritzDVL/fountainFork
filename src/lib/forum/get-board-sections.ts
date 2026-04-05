import { createClient } from "@/lib/db/server";
import { LANDING_SECTIONS } from "./categories";

export interface BoardCategory {
  slug: string;
  name: string;
  description: string;
  feed: string;
  threadCount: number;
  latestActivity: string | null;
}

export interface BoardSection {
  id: string;
  title: string;
  layout: "list" | "grid";
  feed: string;
  categories: BoardCategory[];
}

export async function getBoardSections(): Promise<BoardSection[]> {
  const db = await createClient();

  const { data: dbCategories } = await db
    .from("forum_categories")
    .select("slug, thread_count")
    .order("display_order");

  const { data: latestThreads } = await db
    .from("forum_threads")
    .select("category, last_reply_at, created_at")
    .eq("is_hidden", false)
    .order("last_reply_at", { ascending: false, nullsFirst: false });

  const countMap = new Map(
    (dbCategories || []).map((c: any) => [c.slug, c.thread_count]),
  );

  const activityMap = new Map<string, string>();
  for (const t of latestThreads || []) {
    if (!activityMap.has(t.category)) {
      activityMap.set(t.category, t.last_reply_at || t.created_at);
    }
  }

  return LANDING_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    layout: section.layout,
    feed: section.feed,
    categories: section.categories.map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      feed: cat.feed,
      threadCount: countMap.get(cat.slug) || 0,
      latestActivity: activityMap.get(cat.slug) || null,
    })),
  }));
}
