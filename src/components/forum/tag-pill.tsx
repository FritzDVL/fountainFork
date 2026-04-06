import Link from "next/link";

interface TagPillProps {
  tag: string;
}

export function TagPill({ tag }: TagPillProps) {
  return (
    <Link
      href={`/research?tag=${tag}`}
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] text-muted-foreground border border-border hover:opacity-80 transition-opacity"
    >
      #{tag}
    </Link>
  );
}
