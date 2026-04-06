import Link from "next/link";
import { getCategoryBySlug } from "@/lib/forum/categories";

interface CategoryBadgeProps {
  slug: string;
}

export function CategoryBadge({ slug }: CategoryBadgeProps) {
  const category = getCategoryBySlug(slug);
  if (!category) return null;

  return (
    <Link
      href={`/research?category=${slug}`}
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium bg-muted hover:opacity-80 transition-opacity"
    >
      <span
        className="h-2 w-2 rounded-sm flex-shrink-0"
        style={{ backgroundColor: category.color || "#6b7280" }}
      />
      {category.name}
    </Link>
  );
}
