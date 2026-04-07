import type { BoardSection } from "@/lib/forum/get-board-sections";
import { BoardCategoryRow } from "./board-category-row";

export function BoardSectionList({ section }: { section: BoardSection }) {
  return (
    <div className="mb-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-muted flex items-center gap-2">
        <span className="w-[3px] h-3.5 rounded-sm bg-muted-foreground" />
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground flex-1">
          {section.title}
        </span>
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="min-w-[48px] text-center">Threads</span>
          <span className="min-w-[56px] text-right">Activity</span>
        </div>
      </div>
      {section.categories.map((cat) => (
        <BoardCategoryRow key={cat.slug} category={cat} />
      ))}
    </div>
  );
}
