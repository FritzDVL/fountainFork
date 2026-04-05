"use client";

import { useComposer } from "@/hooks/forum/use-composer";
import { Button } from "@/components/ui/button";

export function NewThreadButton({ category }: { category?: string }) {
  const { openNewThread } = useComposer();

  return (
    <Button size="sm" onClick={() => openNewThread(category)}>
      + New Thread
    </Button>
  );
}
