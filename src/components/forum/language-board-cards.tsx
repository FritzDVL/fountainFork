import type { LanguageBoard } from "@/lib/forum/categories";

export function LanguageBoardCards({ boards }: { boards: LanguageBoard[] }) {
  return (
    <div className="mt-8">
      <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-3">
        Language Boards
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {boards.map((board) => (
          <div
            key={board.name}
            className="border rounded-lg p-5 text-center cursor-pointer hover:bg-muted/50 hover:-translate-y-0.5 transition-all"
          >
            <div className="text-3xl mb-2">{board.flag}</div>
            <div className="font-semibold text-sm">{board.name}</div>
            <div className="text-xs text-muted-foreground">{board.members} members</div>
            <div className="text-xs text-muted-foreground mt-1 opacity-70">{board.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
