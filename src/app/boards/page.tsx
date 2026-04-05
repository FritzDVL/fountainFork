import { getBoardSections } from "@/lib/forum/get-board-sections";
import { LANGUAGE_BOARDS } from "@/lib/forum/categories";
import { BoardSectionList } from "@/components/forum/board-section-list";
import { BoardSectionGrid } from "@/components/forum/board-section-grid";
import { LanguageBoardCards } from "@/components/forum/language-board-cards";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const sections = await getBoardSections();

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-8">
      {sections.map((section) =>
        section.layout === "grid" ? (
          <BoardSectionGrid key={section.id} section={section} />
        ) : (
          <BoardSectionList key={section.id} section={section} />
        ),
      )}
      <LanguageBoardCards boards={LANGUAGE_BOARDS} />
    </div>
  );
}
