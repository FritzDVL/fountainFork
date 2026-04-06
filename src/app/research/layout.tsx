"use client";

import { ComposerContextProvider } from "@/hooks/forum/use-composer";
import { ComposerPanel } from "@/components/forum/composer-panel";

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComposerContextProvider>
      <div style={{ paddingBottom: "var(--composer-height, 0)", transition: "padding-bottom 250ms" }}>
        {children}
      </div>
      <ComposerPanel />
    </ComposerContextProvider>
  );
}
