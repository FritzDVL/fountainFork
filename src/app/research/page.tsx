import { getResearchThreads } from "@/lib/forum/get-research-threads";
import { ResearchFilterToolbar } from "@/components/forum/research-filter-toolbar";
import { ResearchThreadRow } from "@/components/forum/research-thread-row";

interface Props {
  searchParams: { category?: string; tag?: string; page?: string };
}

export default async function ResearchPage({ searchParams }: Props) {
  const page = Number(searchParams.page) || 1;
  const { threads, total, allTags, categoryCounts } = await getResearchThreads({
    category: searchParams.category,
    tag: searchParams.tag,
    page,
  });

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8">
      <div className="mb-2">
        <h1 className="text-[22px] font-bold tracking-tight flex items-center gap-2">
          🔒 Society Protocol Research
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Technical research and discussion — token-gated posting
        </p>
      </div>

      <ResearchFilterToolbar categoryCounts={categoryCounts} allTags={allTags} />

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="py-2 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Topic</th>
            <th className="py-2 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border hidden md:table-cell">Started by</th>
            <th className="py-2 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border hidden md:table-cell">Replies</th>
            <th className="py-2 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border hidden md:table-cell">Views</th>
            <th className="py-2 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border hidden md:table-cell">Activity</th>
          </tr>
        </thead>
        <tbody>
          {threads.map((t) => (
            <ResearchThreadRow
              key={t.id}
              rootPublicationId={t.rootPublicationId}
              title={t.title}
              category={t.category}
              tags={t.tags}
              authorUsername={t.authorUsername}
              replyCount={t.replyCount}
              viewsCount={t.viewsCount}
              lastReplyAt={t.lastReplyAt}
              createdAt={t.createdAt}
              isPinned={t.isPinned}
            />
          ))}
        </tbody>
      </table>

      {threads.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No research threads yet. Be the first to start one.
        </div>
      )}

      {total > 20 * page && (
        <div className="flex justify-center py-6">
          <a
            href={`/research?${new URLSearchParams({ ...(searchParams.category ? { category: searchParams.category } : {}), ...(searchParams.tag ? { tag: searchParams.tag } : {}), page: String(page + 1) }).toString()}`}
            className="inline-flex items-center h-8 px-3 rounded-md text-xs font-medium border border-border hover:bg-muted transition-colors"
          >
            Load More
          </a>
        </div>
      )}
    </div>
  );
}
