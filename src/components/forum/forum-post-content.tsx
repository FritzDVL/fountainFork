"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const Editor = dynamic(() => import("@/components/editor/editor"), { ssr: false });

export function ForumPostContent({ contentJson }: { contentJson: any | null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Remove Fountain's centering after the editor renders
  useEffect(() => {
    if (!containerRef.current) return;
    const timer = setTimeout(() => {
      const centered = containerRef.current?.querySelectorAll('[class*="mx-auto"]');
      centered?.forEach((el) => {
        (el as HTMLElement).style.maxWidth = "none";
        (el as HTMLElement).style.marginLeft = "0";
        (el as HTMLElement).style.marginRight = "0";
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [contentJson]);

  if (!contentJson) {
    return <div className="text-muted-foreground italic text-sm">Content unavailable</div>;
  }

  return (
    <div ref={containerRef}>
      <Editor value={JSON.stringify(contentJson)} readOnly={true} showToc={false} />
    </div>
  );
}
