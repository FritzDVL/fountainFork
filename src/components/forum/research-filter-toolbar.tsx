"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { getCategoriesByFeed } from "@/lib/forum/categories";
import { useComposer } from "@/hooks/forum/use-composer";
import { ResearchJoinButton } from "./research-join-button";

interface FilterToolbarProps {
  categoryCounts: Record<string, number>;
  allTags: string[];
}

export function ResearchFilterToolbar({ categoryCounts, allTags }: FilterToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "";
  const activeTag = searchParams.get("tag") || "";
  const { openNewThread } = useComposer();

  const researchCategories = getCategoriesByFeed("research").filter(c => c.section === "technical");

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/research?${params.toString()}`);
  };

  const clearFilters = () => router.push("/research");

  return (
    <div className="flex items-center gap-2 flex-wrap border-b border-border pb-4 mb-0 mt-5">
      <Dropdown
        label={activeCategory ? researchCategories.find(c => c.slug === activeCategory)?.name || activeCategory : "All Categories"}
        activeColor={activeCategory ? researchCategories.find(c => c.slug === activeCategory)?.color : undefined}
        items={researchCategories.map(c => ({
          key: c.slug,
          label: c.name,
          color: c.color,
          count: categoryCounts[c.slug] || 0,
        }))}
        onSelect={(slug) => setFilter("category", slug === activeCategory ? "" : slug)}
      />

      <Dropdown
        label={activeTag ? `#${activeTag}` : "All Tags"}
        items={allTags.map(t => ({ key: t, label: `#${t}` }))}
        onSelect={(tag) => setFilter("tag", tag === activeTag ? "" : tag)}
      />

      <button
        type="button"
        onClick={clearFilters}
        className={`px-3 py-1.5 text-[13px] font-semibold bg-transparent border-none cursor-pointer ${
          !activeCategory && !activeTag ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Latest
      </button>

      <div className="ml-auto">
        <ResearchJoinButton openNewThread={() => openNewThread(researchCategories[0]?.slug)} />
      </div>
    </div>
  );
}

// Reusable dropdown
interface DropdownItem {
  key: string;
  label: string;
  color?: string;
  count?: number;
}

function Dropdown({ label, activeColor, items, onSelect }: {
  label: string;
  activeColor?: string;
  items: DropdownItem[];
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium border border-border bg-transparent text-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <span
          className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
          style={{ backgroundColor: activeColor || "transparent", border: activeColor ? "none" : "1px solid hsl(215 20.2% 65.1%)" }}
        />
        {label}
        <span className="text-[9px] text-muted-foreground ml-0.5">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[220px] rounded-md border border-border bg-background shadow-lg py-1">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => { onSelect(item.key); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-left hover:bg-muted transition-colors cursor-pointer"
            >
              {item.color && (
                <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              )}
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-[11px] text-muted-foreground">× {item.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
