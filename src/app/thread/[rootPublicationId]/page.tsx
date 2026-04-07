import Link from "next/link";
import { notFound } from "next/navigation";
import { Pin, Lock } from "lucide-react";
import { getThreadDetail } from "@/lib/forum/get-thread-detail";
import { getCategoryBySlug } from "@/lib/forum/categories";
import { ForumPostCard } from "@/components/forum/forum-post-card";
import { ReplyButton } from "@/components/forum/reply-button";
import { ThreadModActions } from "@/components/forum/mod-actions";
import { ReplyModActions } from "@/components/forum/mod-actions";
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
        {thread.feed === "research" ? (
          <>
            <Link href="/research" className="hover:underline hover:text-foreground">Research</Link>
            {" / "}
            <Link href={`/research?category=${thread.category}`} className="hover:underline hover:text-foreground">
              {category?.name || thread.category}
            </Link>
          </>
        ) : (
          <>
            <Link href="/boards" className="hover:underline hover:text-foreground">Boards</Link>
            {" / "}
            <Link
              href={`/boards/${thread.feed}?category=${thread.category}`}
              className="hover:underline hover:text-foreground"
            >
              {category?.name || thread.category}
            </Link>
          </>
        )}
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
        <ThreadModActions threadId={thread.id} isPinned={thread.isPinned} isLocked={thread.isLocked} />
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
        title={thread.title}
        publicationId={thread.rootPublicationId}
        replyButton={<ReplyButton rootPublicationId={thread.rootPublicationId} feed={thread.feed as FeedType} threadTitle={thread.title} quotedText={thread.contentJson ? "Original post content" : undefined} quotedAuthor={thread.authorUsername || undefined} quotedPosition={0} />}
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
          publicationId={reply.publicationId}
          modActions={<ReplyModActions replyId={reply.id} />}
          replyButton={<ReplyButton rootPublicationId={thread.rootPublicationId} feed={thread.feed as FeedType} threadTitle={thread.title} quotedText={reply.summary || reply.contentJson?.[0]?.children?.[0]?.text || undefined} quotedAuthor={reply.authorUsername || undefined} quotedPosition={reply.position} />}
        />
      ))}

      {/* Reply via composer — click Reply on any post */}
    </div>
  );
}
