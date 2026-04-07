/**
 * Incremental Sync Script — Catches new posts from Lens
 *
 * Run: npx tsx scripts/sync-forum.ts
 * Cron: */5 * * * * cd /opt/society-forum && npx tsx scripts/sync-forum.ts >> /var/log/forum-sync.log 2>&1
 */

import { PublicClient, mainnet, testnet } from "@lens-protocol/client";
import { fetchPosts } from "@lens-protocol/client/actions";
import { evmAddress } from "@lens-protocol/client";
import { createClient } from "@supabase/supabase-js";

const LENS_ENV = process.env.NEXT_PUBLIC_ENVIRONMENT === "development" ? testnet : mainnet;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const FEEDS = {
  commons: "0x3e7EEfaC1cF8Aaf260d045694B2312139f46fd03",
  research: "0xb3E74A66c813b79c63Db6A5f13D57ffBDa62D590",
} as const;

const lens = PublicClient.create({ environment: LENS_ENV, origin: "https://forum.societyprotocol.io" });
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getAttr(post: any, key: string): string | undefined {
  return post.metadata?.attributes?.find((a: any) => a.key === key)?.value;
}

async function sync() {
  const now = new Date().toISOString();
  let newThreads = 0;
  let newReplies = 0;

  for (const [feedName, feedAddress] of Object.entries(FEEDS)) {
    // Fetch recent posts (first page only — ~50 posts)
    const result = await fetchPosts(lens, {
      filter: { feeds: [{ feed: evmAddress(feedAddress) }] },
    }).unwrapOr(null);

    if (!result) continue;

    for (const post of result.items as any[]) {
      if (post.isDeleted) {
        // Mark hidden if we have it
        await db.from("forum_threads").update({ is_hidden: true }).eq("root_publication_id", post.id);
        await db.from("forum_thread_replies").update({ is_hidden: true }).eq("publication_id", post.id);
        continue;
      }

      const forumCategory = getAttr(post, "forumCategory");
      const forumThreadId = getAttr(post, "forumThreadId");

      if (forumCategory) {
        // Check if thread exists
        const { data: existing } = await db
          .from("forum_threads")
          .select("id")
          .eq("root_publication_id", post.id)
          .single();

        if (!existing) {
          const contentJson = getAttr(post, "contentJson");
          const tags = (post.metadata?.tags || []).filter((t: string) => t !== forumCategory);

          await db.from("forum_threads").insert({
            root_publication_id: post.id,
            feed: feedName,
            category: forumCategory || "off-topic",
            title: post.metadata?.title || "Untitled",
            content_json: contentJson ? JSON.parse(contentJson) : null,
            content_text: "",
            author_address: post.author.address,
            author_username: post.author.username?.localName || null,
            tags,
            created_at: post.timestamp,
            last_reply_at: post.timestamp,
          });
          newThreads++;
        }
      } else if (forumThreadId) {
        // Check if reply exists
        const { data: existing } = await db
          .from("forum_thread_replies")
          .select("id")
          .eq("publication_id", post.id)
          .single();

        if (!existing) {
          const { data: thread } = await db
            .from("forum_threads")
            .select("id, reply_count")
            .eq("root_publication_id", forumThreadId)
            .single();

          if (!thread) continue;

          const contentJson = getAttr(post, "contentJson");
          const position = (thread.reply_count || 0) + 1;

          await db.from("forum_thread_replies").insert({
            thread_id: thread.id,
            publication_id: post.id,
            position,
            content_json: contentJson ? JSON.parse(contentJson) : null,
            content_text: "",
            author_address: post.author.address,
            author_username: post.author.username?.localName || null,
            created_at: post.timestamp,
          });

          await db
            .from("forum_threads")
            .update({ reply_count: position, last_reply_at: post.timestamp })
            .eq("id", thread.id);

          newReplies++;
        }
      }
    }
  }

  if (newThreads > 0 || newReplies > 0) {
    console.log(`[${now}] Synced: ${newThreads} new threads, ${newReplies} new replies`);
  }
}

sync().catch((err) => {
  console.error(`[${new Date().toISOString()}] Sync failed:`, err.message);
  process.exit(1);
});
