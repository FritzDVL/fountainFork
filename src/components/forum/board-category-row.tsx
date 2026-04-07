import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import type { BoardCategory } from "@/lib/forum/get-board-sections";

export function BoardCategoryRow({ category }: { category: BoardCategory }) {
  return (
    <Link
      href={`/boards/${category.feed}?category=${category.slug}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{category.name}</div>
        <div className="text-xs text-muted-foreground truncate">{category.description}</div>
      </div>
      <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground ml-4">
        <div className="text-center min-w-[48px]">
          <div className="font-semibold text-foreground">{category.threadCount}</div>
        </div>
        {category.latestActivity && (
          <div className="text-right min-w-[56px]">
            {formatRelativeTime(category.latestActivity)}
          </div>
        )}
      </div>
    </Link>
  );
}
