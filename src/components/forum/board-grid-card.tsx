import Link from "next/link";

interface GridCardProps {
  slug: string;
  name: string;
  feed: string;
}

export function BoardGridCard({ slug, name, feed }: GridCardProps) {
  return (
    <Link
      href={`/boards/${feed}?category=${slug}`}
      className="border rounded-md px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
    >
      <span className="text-xs text-muted-foreground">✦</span>
      <span className="text-sm font-medium">{name}</span>
    </Link>
  );
}
