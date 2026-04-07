/**
 * Full Recovery Script — Reconstructs forum from Lens Protocol
 *
 * Run: npx tsx scripts/recover-forum.ts
 *
 * This reads ALL posts from both Lens Feeds and rebuilds
 * forum_threads + forum_thread_replies in Supabase.
 */

import { PublicClient, mainnet, testnet } from "@lens-protocol/client";
import { fetchPosts } from "@lens-protocol/client/actions";
import { evmAddress } from "@lens-protocol/client";
import { createClient } from "@supabase/supabase-js";

// ---- Config (edit these or use env vars) ----
const LENS_ENV = process.env.NEXT_PUBLIC_ENVIRONMENT === "development" ? testnet : mainnet;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const FEEDS = {
  commons: "0x3e7EEfaC1cF8Aaf260d045694B2312139f46fd03",
  research: "0xb3E74A66c813b79c63Db6A5f13D57ffBDa62D590",
} as const;

// ---- Setup ----
const lens = PublicClient.create({ environment: LENS_ENV, origin: "https://forum.societyprotocol.io" });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface RawPost {
  id: string;
  author: { address: string; username?: { localName: string } | null };
  metadata: {
    title?: string;
    tags?: string[];
    attributes?: { key: string; type: string; value: string }[];
  };
  timestamp: string;
  isDeleted?: boolean;
}

function getAttr(post: RawPost, key: string): string | undefined {
  return post.metadata?.attributes?.find((a) => a.key === key)?.value;
}

async function fetchAllFromFeed(feedAddress: string): Promise<RawPost[]> {
  const all: RawPost[] = [];
  let cursor: string | undefined;

  while (true) {
    const result = await fetchPosts(lens, {
      filter: { feeds: [{ feed: evmAddress(feedAddress) }] },
      cursor,
    }).unwrapOr(null);

    if (!result || result.items.length === 0) break;

    all.push(...(result.items as unknown as RawPost[]));
    console.log(`  Fetched ${all.length} posts so far...`);

    if (!result.pageInfo?.next) break;
    cursor = result.pageInfo.next;
  }

  return all;
}

async function recover() {
  console.log("=== Forum Recovery Script ===\n");

  let totalThreads = 0;
  let totalReplies = 0;
  let skipped = 0;

  for (const [feedName, feedAddress] of Object.entries(FEEDS)) {
    console.log(`\nFetching from ${feedName} feed (${feedAddress})...`);
    const posts = await fetchAllFromFeed(feedAddress);
    console.log(`Found ${posts.length} total posts in ${feedName} feed`);

    // Separate threads and replies
    const threads: RawPost[] = [];
    const replies: RawPost[] = [];

    for (const post of posts) {
      if (post.isDeleted) continue;
      const forumCategory = getAttr(post, "forumCategory");
      const forumThreadId = getAttr(post, "forumThreadId");

      if (forumCategory) {
        threads.push(post);
      } else if (forumThreadId) {
        replies.push(post);
      } else {
        skipped++;
      }
    }

    console.log(`  ${threads.length} threads, ${replies.length} replies, ${skipped} skipped`);

    // Upsert threads
    for (const post of threads) {
      const category = getAttr(post, "forumCategory") || "off-topic";
      const contentJson = getAttr(post, "contentJson");
      const tags = post.metadata?.tags || [];
      // First tag is usually the category, rest are user tags
      const userTags = tags.filter((t) => t !== category);

      const { error } = await db.from("forum_threads").upsert(
        {
          root_publication_id: post.id,
          feed: feedName,
          category,
          title: post.metadata?.title || "Untitled",
          content_json: contentJson ? JSON.parse(contentJson) : null,
          content_text: "", // Could extract from contentJson if needed
          author_address: post.author.address,
          author_username: post.author.username?.localName || null,
          tags: userTags,
          created_at: post.timestamp,
          last_reply_at: post.timestamp,
        },
        { onConflict: "root_publication_id" },
      );

      if (error) {
        console.error(`  Error upserting thread ${post.id}:`, error.message);
      } else {
        totalThreads++;
      }
    }

    // Sort replies by timestamp for correct position assignment
    replies.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Track positions per thread
    const positionCounters: Record<string, number> = {};

    for (const post of replies) {
      const threadRootId = getAttr(post, "forumThreadId")!;
      const contentJson = getAttr(post, "contentJson");

      // Get or increment position
      positionCounters[threadRootId] = (positionCounters[threadRootId] || 0) + 1;
      const position = positionCounters[threadRootId];

      // Find parent thread to get its DB id
      const { data: thread } = await db
        .from("forum_threads")
        .select("id")
        .eq("root_publication_id", threadRootId)
        .single();

      if (!thread) {
        console.error(`  Parent thread not found for reply ${post.id} (thread: ${threadRootId})`);
        continue;
      }

      const { error } = await db.from("forum_thread_replies").upsert(
        {
          thread_id: thread.id,
          publication_id: post.id,
          position,
          content_json: contentJson ? JSON.parse(contentJson) : null,
          content_text: "",
          author_address: post.author.address,
          author_username: post.author.username?.localName || null,
          created_at: post.timestamp,
        },
        { onConflict: "publication_id" },
      );

      if (error) {
        console.error(`  Error upserting reply ${post.id}:`, error.message);
      } else {
        totalReplies++;
      }
    }

    // Update reply counts and last_reply_at on threads
    for (const [threadRootId, count] of Object.entries(positionCounters)) {
      const { data: lastReply } = await db
        .from("forum_thread_replies")
        .select("created_at, thread_id")
        .eq("thread_id", (await db.from("forum_threads").select("id").eq("root_publication_id", threadRootId).single()).data?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (lastReply) {
        await db
          .from("forum_threads")
          .update({ reply_count: count, last_reply_at: lastReply.created_at })
          .eq("root_publication_id", threadRootId);
      }
    }
  }

  // Recount category thread_counts
  const { data: categories } = await db.from("forum_categories").select("slug");
  if (categories) {
    for (const cat of categories) {
      const { count } = await db
        .from("forum_threads")
        .select("*", { count: "exact", head: true })
        .eq("category", cat.slug);
      await db.from("forum_categories").update({ thread_count: count || 0 }).eq("slug", cat.slug);
    }
  }

  console.log(`\n=== Recovery Complete ===`);
  console.log(`Threads recovered: ${totalThreads}`);
  console.log(`Replies recovered: ${totalReplies}`);
  console.log(`Posts skipped (no forum attributes): ${skipped}`);
}

recover().catch((err) => {
  console.error("Recovery failed:", err);
  process.exit(1);
});
