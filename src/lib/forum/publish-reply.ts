import { evmAddress, uri } from "@lens-protocol/client";
import { fetchPost, post } from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { article } from "@lens-protocol/metadata";
import { MetadataAttributeType } from "@lens-protocol/metadata";
import { getLensClient } from "@/lib/lens/client";
import { storageClient } from "@/lib/lens/storage-client";
import { getUserAccount } from "@/lib/auth/get-user-profile";
import { FEED_MAP, type FeedType } from "./constants";
import type { ForumDraft } from "./types";

export interface PublishReplyResult {
  success: boolean;
  publicationId?: string;
  error?: string;
}

export async function publishReply(
  draft: ForumDraft,
  threadRootPublicationId: string,
  threadFeed: FeedType,
  walletClient: any,
): Promise<PublishReplyResult> {
  const { username, address } = await getUserAccount();
  if (!username || !address) return { success: false, error: "Not logged in" };

  const lens = await getLensClient();
  if (!lens.isSessionClient()) return { success: false, error: "No Lens session" };

  const attributes = [
    { key: "contentJson", type: MetadataAttributeType.JSON, value: JSON.stringify(draft.contentJson) },
    { key: "forumThreadId", type: MetadataAttributeType.STRING, value: threadRootPublicationId },
  ];

  const metadata = article({
    title: draft.title || "",
    content: draft.contentMarkdown || "",
    locale: "en",
    tags: draft.tags || [],
    attributes,
  });

  const { uri: contentUri } = await storageClient.uploadAsJson(metadata);
  if (!contentUri) return { success: false, error: "Failed to upload content" };

  const feedAddress = FEED_MAP[threadFeed];

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
  await fetch("/api/forum/replies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadRootPublicationId,
      publicationId,
      contentUri,
      contentText: draft.contentMarkdown || "",
      contentJson: draft.contentJson,
      summary: (draft.contentMarkdown || "").slice(0, 200),
      authorAddress: address,
      authorUsername: username,
    }),
  });

  return { success: true, publicationId };
}
