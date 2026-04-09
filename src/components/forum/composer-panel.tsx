"use client";

import { X, PenSquare, Minimize2, Maximize2 } from "lucide-react";
import { useComposer } from "@/hooks/forum/use-composer";
import { ComposerHeader } from "./composer-header";
import { ForumEditor, type ForumEditorHandle } from "./forum-editor";
import { Button } from "@/components/ui/button";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWalletClient } from "wagmi";
import { toast } from "sonner";
import { publishThread } from "@/lib/forum/publish-thread";
import { publishReply } from "@/lib/forum/publish-reply";
import type { ForumDraft } from "@/lib/forum/types";

export function ComposerPanel() {
  const { state, close } = useComposer();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [panelState, setPanelState] = useState<"half" | "full" | "minimized">("half");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const editorHandleRef = useRef<ForumEditorHandle | null>(null);
  const router = useRouter();
  const { data: walletClient } = useWalletClient();

  const isOpen = state.status === "open";
  if (!isOpen) return null;

  const isResearch = typeof window !== "undefined" && window.location.pathname.startsWith("/research");

  const getCategoryFromUrl = () => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("category") || "";
  };

  const handleSubmit = async () => {
    if (!walletClient) {
      toast.error("Please connect your wallet");
      return;
    }

    const handle = editorHandleRef.current;
    if (!handle) {
      toast.error("Editor not ready");
      return;
    }

    const contentJson = handle.getContentJson();
    const contentMarkdown = handle.getContentMarkdown();

    if (!contentJson || contentJson.length === 0) {
      toast.error("Write something first");
      return;
    }

    const draft: ForumDraft = {
      title: title || "Untitled",
      contentJson,
      contentMarkdown: contentMarkdown || title || "Post",
      tags: tags,
    };

    setIsPublishing(true);
    const pending = toast.loading(state.mode === "thread" ? "Publishing thread..." : "Publishing reply...");

    try {
      if (state.mode === "thread") {
        const category = isResearch ? selectedCategory : getCategoryFromUrl();
        if (!category) {
          toast.dismiss(pending);
          toast.error("Could not determine category");
          setIsPublishing(false);
          return;
        }

        const result = await publishThread(draft, category, walletClient);
        toast.dismiss(pending);

        if (result.success) {
          toast.success("Thread published!");
          close();
          setTitle("");
          setTags([]);
          setSelectedCategory("");
          router.push(`/thread/${result.publicationId}`);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to publish");
        }
      } else if (state.mode === "reply" && state.threadRef) {
        const result = await publishReply(
          draft,
          state.threadRef.rootPublicationId,
          state.threadRef.feed,
          walletClient,
          state.threadRef.title,
        );
        toast.dismiss(pending);

        if (result.success) {
          toast.success("Reply published!");
          close();
          router.refresh();
        } else {
          toast.error(result.error || "Failed to publish");
        }
      }
    } catch (err: any) {
      toast.dismiss(pending);
      toast.error(err.message || "Publishing failed");
    } finally {
      setIsPublishing(false);
    }
  };

  const panelHeight = panelState === "full" ? "100vh" : panelState === "minimized" ? "45px" : dragHeight ? `${dragHeight}px` : "60vh";

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = (e.target as HTMLElement).closest("[data-composer-panel]")?.clientHeight || window.innerHeight * 0.6;

    const onMove = (ev: MouseEvent) => {
      const newHeight = Math.max(200, Math.min(window.innerHeight - 50, startHeight + (startY - ev.clientY)));
      setDragHeight(newHeight);
      setPanelState("half");
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Minimized: thin draft bar
  if (panelState === "minimized") {
    return (
      <>
        <style>{`:root { --composer-height: 45px; }`}</style>
        <div className="fixed bottom-0 left-0 right-0 z-40 h-[45px] bg-background border-t-2 border-border shadow-2xl flex items-center px-4 cursor-pointer" onClick={() => setPanelState("half")}>
          <PenSquare className="h-3.5 w-3.5 text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground truncate flex-1">
            {state.mode === "thread" ? "New Thread" : "Reply"}{title ? `: ${title}` : ""}
          </span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setPanelState("half"); }}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); close(); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`:root { --composer-height: ${panelHeight}; }`}</style>

      <div data-composer-panel className={`fixed bottom-0 left-0 right-0 z-40 bg-background border-t-2 border-border shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200`} style={{ height: panelHeight }}>
        {/* Resize handle */}
        <div className="h-1.5 cursor-row-resize flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0" onMouseDown={handleDragStart}>
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <PenSquare className="h-4 w-4" />
            {state.mode === "thread" ? "New Thread" : "Reply"}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPanelState("minimized")} className="text-muted-foreground">
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPanelState(panelState === "full" ? "half" : "full")} className="text-muted-foreground">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={close} disabled={isPublishing}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Header (title / reply info) */}
        <ComposerHeader
          mode={state.mode}
          title={title}
          onTitleChange={setTitle}
          category={selectedCategory}
          onCategoryChange={setSelectedCategory}
          tags={tags}
          onTagsChange={setTags}
          isResearch={isResearch}
          threadRef={state.threadRef}
          availableTags={["game-theory", "function-ideas", "hunting", "property", "parenting", "governance", "organizations", "curation", "farming", "portal", "communication"]}
        />

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="border border-border rounded-lg overflow-hidden">
            <ForumEditor
            readOnly={false}
            value={state.quotedText ? JSON.stringify([
              { type: "blockquote", children: [{ type: "p", children: [{ text: state.quotedText }] }] },
              { type: "p", children: [{ text: "" }] },
            ]) : undefined}
            editorRef={(handle) => { editorHandleRef.current = handle; }}
          />
          </div>
        </div>

        {/* Submit bar */}
        <div className="flex items-center justify-end px-4 py-3 border-t bg-muted/20 shrink-0">
          <Button size="lg" onClick={handleSubmit} disabled={isPublishing}>
            {isPublishing
              ? "Publishing..."
              : state.mode === "thread" ? "Create Topic" : "Post Reply"}
          </Button>
        </div>
      </div>
    </>
  );
}
