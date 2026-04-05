import Link from "next/link";
import { notFound } from "next/navigation";
import { Pin, Lock } from "lucide-react";
import { getThreadDetail } from "@/lib/forum/get-thread-detail";
import { getCategoryBySlug } from "@/lib/forum/categories";
import { ForumPostCard } from "@/components/forum/forum-post-card";
import { ReplyButton } from "@/components/forum/reply-button";
import type { FeedType } from "@/lib/forum/constants";

export const dynamic = "force-dynamic";

interface Props {
  params: { rootPublicationId: string };
}

export default async function ThreadPage({ params }: Props) {
  const result = await getThreadDetail(params.rootPublicationId);
  if (!result) return notFound();

  const { thread, replies } = result;
  const category = getCategoryBySlug(thread.category);

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/boards" className="hover:underline hover:text-foreground">Boards</Link>
        {" / "}
        <Link
          href={`/boards/${thread.feed}?category=${thread.category}`}
          className="hover:underline hover:text-foreground"
        >
          {category?.name || thread.category}
        </Link>
      </div>

      {/* Thread header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {thread.isPinned && <Pin className="h-4 w-4 text-primary" />}
          {thread.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          <h1 className="text-2xl font-bold">{thread.title}</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"} · {thread.viewsCount} views
        </div>
      </div>

      {/* Root post */}
      <ForumPostCard
        contentJson={thread.contentJson}
        authorUsername={thread.authorUsername}
        authorAddress={thread.authorAddress}
        createdAt={thread.createdAt}
        upvotes={thread.upvotes}
        downvotes={thread.downvotes}
        position={0}
        isRoot
        replyButton={<ReplyButton rootPublicationId={thread.rootPublicationId} feed={thread.feed as FeedType} threadTitle={thread.title} />}
      />

      {/* Replies */}
      {replies.map((reply) => (
        <ForumPostCard
          key={reply.id}
          contentJson={reply.contentJson}
          authorUsername={reply.authorUsername}
          authorAddress={reply.authorAddress}
          createdAt={reply.createdAt}
          upvotes={reply.upvotes}
          downvotes={reply.downvotes}
          position={reply.position}
          replyButton={<ReplyButton rootPublicationId={thread.rootPublicationId} feed={thread.feed as FeedType} threadTitle={thread.title} />}
        />
      ))}

      {/* Reply via composer — click Reply on any post */}
    </div>
  );
}
