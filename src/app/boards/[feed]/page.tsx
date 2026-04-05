import Link from "next/link";
import { notFound } from "next/navigation";
import { getThreadsByCategory } from "@/lib/forum/get-threads";
import { getCategoryBySlug } from "@/lib/forum/categories";
import { NewThreadButton } from "@/components/forum/new-thread-button";
import { ThreadListView } from "@/components/forum/thread-list-view";

export const dynamic = "force-dynamic";

interface Props {
  params: { feed: string };
  searchParams: { category?: string; page?: string };
}

export default async function ThreadListPage({ params, searchParams }: Props) {
  const category = searchParams.category;
  if (!category) return notFound();

  const cat = getCategoryBySlug(category);
  if (!cat) return notFound();

  const page = Number(searchParams.page) || 1;
  const { threads, total } = await getThreadsByCategory(category, page);

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/boards" className="hover:underline hover:text-foreground">Boards</Link>
        {" / "}
        <span>{cat.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{cat.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{cat.description}</p>
        </div>
        <NewThreadButton category={category} />
      </div>

      <ThreadListView threads={threads} total={total} page={page} />
    </div>
  );
}
