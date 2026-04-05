"use client";

import dynamic from "next/dynamic";

const ForumEditor = dynamic(
  () => import("./forum-editor").then((m) => ({ default: m.ForumEditor })),
  { ssr: false },
);

export function ForumPostContent({ contentJson }: { contentJson: any | null }) {
  if (!contentJson) {
    return <div className="text-muted-foreground italic text-sm">Content unavailable</div>;
  }

  return <ForumEditor value={JSON.stringify(contentJson)} readOnly={true} />;

}
