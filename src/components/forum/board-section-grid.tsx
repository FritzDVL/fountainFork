import type { BoardSection } from "@/lib/forum/get-board-sections";
import { BoardGridCard } from "./board-grid-card";

export function BoardSectionGrid({ section }: { section: BoardSection }) {
  const cats = section.categories;
  const firstRow = cats.slice(0, 2);
  const restRows: typeof cats[] = [];
  for (let i = 2; i < cats.length; i += 3) {
    restRows.push(cats.slice(i, i + 3));
  }

  return (
    <div className="mb-6 border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-muted flex items-center gap-2">
        <span className="w-[3px] h-3.5 rounded-sm bg-muted-foreground" />
        <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {section.title}
        </span>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {firstRow.map((cat) => (
            <BoardGridCard key={cat.slug} slug={cat.slug} name={cat.name} feed={cat.feed} />
          ))}
        </div>
        {restRows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {row.map((cat) => (
              <BoardGridCard key={cat.slug} slug={cat.slug} name={cat.name} feed={cat.feed} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
