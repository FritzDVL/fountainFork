import Link from "next/link";
import { CategoryBadge } from "./category-badge";
import { TagPill } from "./tag-pill";
import { formatRelativeTime } from "@/lib/utils";

interface ResearchThreadRowProps {
  rootPublicationId: string;
  title: string;
  category: string;
  tags: string[];
  authorUsername: string | null;
  replyCount: number;
  viewsCount: number;
  lastReplyAt: string | null;
  createdAt: string;
  isPinned: boolean;
}

export function ResearchThreadRow({
  rootPublicationId,
  title,
  category,
  tags,
  authorUsername,
  replyCount,
  viewsCount,
  lastReplyAt,
  createdAt,
  isPinned,
}: ResearchThreadRowProps) {
  const activity = lastReplyAt || createdAt;

  return (
    <tr className="border-b border-border hover:bg-muted transition-colors cursor-pointer">
      <td className="py-3.5 px-3 w-[55%]">
        <Link href={`/thread/${rootPublicationId}`} className="text-sm font-medium hover:opacity-80 transition-opacity">
          {isPinned && "📌 "}{title}
        </Link>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <CategoryBadge slug={category} />
          {tags.map((t) => <TagPill key={t} tag={t} />)}
        </div>
      </td>
      <td className="py-3.5 px-3 w-[14%]">
        <div className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-[13px] text-muted-foreground">{authorUsername || "anon"}</span>
        </div>
      </td>
      <td className="py-3.5 px-3 w-[9%] text-center text-[13px] text-muted-foreground">{replyCount}</td>
      <td className="py-3.5 px-3 w-[9%] text-center text-[13px] text-muted-foreground">{viewsCount}</td>
      <td className="py-3.5 px-3 w-[10%] text-center text-xs text-muted-foreground">{formatRelativeTime(activity)}</td>
    </tr>
  );
}
