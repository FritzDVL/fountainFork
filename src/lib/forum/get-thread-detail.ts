import { createClient } from "@/lib/db/server";

export interface ThreadDetail {
  id: string;
  rootPublicationId: string;
  contentUri: string | null;
  contentJson: any | null;
  feed: string;
  category: string;
  title: string;
  authorAddress: string;
  authorUsername: string | null;
  replyCount: number;
  viewsCount: number;
  upvotes: number;
  downvotes: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
}

export interface ThreadReply {
  id: string;
  publicationId: string;
  contentUri: string | null;
  contentJson: any | null;
  position: number;
  authorAddress: string;
  authorUsername: string | null;
  summary: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

export async function getThreadDetail(rootPublicationId: string) {
  const db = await createClient();

  const { data: thread } = await db
    .from("forum_threads")
    .select("*")
    .eq("root_publication_id", rootPublicationId)
    .single();

  if (!thread) return null;

  await db.rpc("forum_increment_views", { p_thread_id: thread.id });

  const { data: replies } = await db
    .from("forum_thread_replies")
    .select("*")
    .eq("thread_id", thread.id)
    .eq("is_hidden", false)
    .order("position", { ascending: true });

  return {
    thread: {
      id: thread.id,
      rootPublicationId: thread.root_publication_id,
      contentUri: thread.content_uri,
      contentJson: thread.content_json,
      feed: thread.feed,
      category: thread.category,
      title: thread.title,
      authorAddress: thread.author_address,
      authorUsername: thread.author_username,
      replyCount: thread.reply_count,
      viewsCount: thread.views_count + 1,
      upvotes: thread.upvotes,
      downvotes: thread.downvotes,
      isPinned: thread.is_pinned,
      isLocked: thread.is_locked,
      createdAt: thread.created_at,
    } as ThreadDetail,
    replies: (replies || []).map((r: any) => ({
      id: r.id,
      publicationId: r.publication_id,
      contentUri: r.content_uri,
      contentJson: r.content_json,
      position: r.position,
      authorAddress: r.author_address,
      authorUsername: r.author_username,
      summary: r.summary,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      createdAt: r.created_at,
    })) as ThreadReply[],
  };
}
