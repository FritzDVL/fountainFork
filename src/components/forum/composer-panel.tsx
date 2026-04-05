"use client";

import { X } from "lucide-react";
import { useComposer } from "@/hooks/forum/use-composer";
import { ComposerHeader } from "./composer-header";
import { ForumEditor } from "./forum-editor";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

export function ComposerPanel() {
  const { state, close } = useComposer();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(state.prefilledCategory || "");
  const editorValueRef = useRef<any>(null);

  const isOpen = state.status === "open";

  // Update category when composer opens with prefilled value
  if (isOpen && state.prefilledCategory && !category) {
    setCategory(state.prefilledCategory);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Set CSS variable for page padding */}
      <style>{`:root { --composer-height: 50vh; }`}</style>

      <div className="fixed bottom-0 left-0 right-0 z-40 h-[50vh] bg-background border-t flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
          <span className="text-sm font-medium">
            {state.mode === "thread" ? "New Thread" : "Reply"}
          </span>
          <Button variant="ghost" size="sm" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Header (title + category or reply info) */}
        <ComposerHeader
          mode={state.mode}
          title={title}
          onTitleChange={setTitle}
          category={category}
          onCategoryChange={setCategory}
          threadRef={state.threadRef}
        />

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-4">
          <ForumEditor
            readOnly={false}
            onChange={(value) => { editorValueRef.current = value; }}
          />
        </div>

        {/* Submit bar */}
        <div className="flex items-center justify-end px-4 py-3 border-t shrink-0">
          <Button
            onClick={() => {
              // Phase 6 will wire this to publishThread / publishReply
              console.log("Submit:", {
                mode: state.mode,
                title,
                category,
                content: editorValueRef.current,
                threadRef: state.threadRef,
              });
            }}
          >
            {state.mode === "thread" ? "Create Topic" : "Post Reply"}
          </Button>
        </div>
      </div>
    </>
  );
}
