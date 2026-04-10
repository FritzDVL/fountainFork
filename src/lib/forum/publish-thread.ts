import { evmAddress, uri } from "@lens-protocol/client";
import { fetchPost, post } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { article } from "@lens-protocol/metadata";
import { MetadataAttributeType } from "@lens-protocol/metadata";
import { getLensClient } from "@/lib/lens/client";
import { storageClient } from "@/lib/lens/storage-client";
import { getUserAccount } from "@/lib/auth/get-user-profile";
import { FEED_MAP } from "./constants";
import { getCategoryBySlug } from "./categories";
import { ensureGroupMembership } from "./ensure-group-membership";
import type { ForumDraft } from "./types";

export interface PublishThreadResult {
  success: boolean;
  publicationId?: string;
  error?: string;
}

export async function publishThread(
  draft: ForumDraft,
  category: string,
  walletClient: any,
): Promise<PublishThreadResult> {
  const cat = getCategoryBySlug(category);
  if (!cat) return { success: false, error: `Invalid category: ${category}` };

  const { username, address } = await getUserAccount();
  if (!username || !address) return { success: false, error: "Not logged in" };

  const lens = await getLensClient();
  if (!lens.isSessionClient()) return { success: false, error: "No Lens session" };

  const attributes = [
    { key: "contentJson", type: MetadataAttributeType.JSON, value: JSON.stringify(draft.contentJson) },
    { key: "forumCategory", type: MetadataAttributeType.STRING, value: category },
  ];

  const forumUrl = "https://forum.societyprotocol.io";

  const metadata = article({
    title: draft.title || "Untitled",
    content: `${draft.title || "Untitled"} — ${forumUrl}`,
    locale: "en",
    tags: [category, ...(draft.tags || [])],
    attributes,
  });

  const { uri: contentUri } = await storageClient.uploadAsJson(metadata);
  if (!contentUri) return { success: false, error: "Failed to upload content" };

  const feedAddress = FEED_MAP[cat.feed];

  await ensureGroupMembership(lens, cat.feed, walletClient);

  // Standalone article — NO commentOn
  const result = await post(lens, {
    contentUri: uri(contentUri),
    feed: evmAddress(feedAddress),
  })
    .andThen(handleOperationWith(walletClient))
    .andThen(lens.waitForTransaction);

  if (result.isErr()) return { success: false, error: `Publish failed: ${result.error}` };

  const postResult = await fetchPost(lens, { txHash: result.value });
  if (postResult.isErr() || !postResult.value) {
    return { success: false, error: "Published but failed to fetch post" };
  }

  const publicationId = postResult.value.id;

  // Track in Supabase
  await fetch("/api/forum/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicationId,
      contentUri,
      feed: cat.feed,
      category,
      title: draft.title || "Untitled",
      summary: (draft.contentMarkdown || "").slice(0, 200),
      contentText: draft.contentMarkdown || "",
      contentJson: draft.contentJson,
      authorAddress: address,
      authorUsername: username,
      tags: draft.tags || [],
    }),
  });

  return { success: true, publicationId };
}
