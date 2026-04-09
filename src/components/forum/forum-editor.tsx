"use client";

import { useMemo } from "react";
import { createPlateEditor, Plate, useEditorPlugin, useEditorRef } from "@udecode/plate/react";
import { MarkdownPlugin } from "@udecode/plate-markdown";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { FloatingToolbar } from "@/components/ui/floating-toolbar";
import { FloatingToolbarButtons } from "@/components/ui/floating-toolbar-buttons";
import { getEditorPlugins } from "@/components/editor/plugins";
import { getRichElements } from "@/components/editor/elements";
import { ComposerToolbarButtons } from "./composer-toolbar-buttons";

export interface ForumEditorHandle {
  getContentJson: () => any;
  getContentMarkdown: () => string;
}

interface ForumEditorProps {
  readOnly?: boolean;
  value?: string;
  onChange?: (value: any) => void;
  editorRef?: (handle: ForumEditorHandle) => void;
}

function EditorWithMarkdown({ onReady }: { onReady: (handle: ForumEditorHandle) => void }) {
  const editor = useEditorRef();
  const { api } = useEditorPlugin(MarkdownPlugin);

  onReady({
    getContentJson: () => editor.children,
    getContentMarkdown: () => {
      try {
        return api.markdown.serialize({ value: editor.children });
      } catch {
        return "";
      }
    },
  });

  return null;
}

export function ForumEditor({ readOnly = false, value, onChange, editorRef }: ForumEditorProps) {
  const editor = useMemo(() => {
    const parsedValue = value ? JSON.parse(value) : [{ type: "p", children: [{ text: "" }] }];
    const allPlugins = getEditorPlugins("forum-editor", undefined, readOnly, false);
    const forumPlugins = allPlugins.filter((p: any) => {
      const key = p?.key || p?.plugin?.key || "";
      return key !== "title" && key !== "subtitle" && key !== "dnd" && key !== "trailingBlock" && key !== "leadingBlock" && key !== "placeholder";
    });

    return createPlateEditor({
      plugins: forumPlugins,
      override: { components: getRichElements() },
      value: parsedValue,
    });
    // Only recreate when value or readOnly changes — NOT on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, readOnly]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Plate
        editor={editor}
        readOnly={readOnly}
        onChange={({ value }) => { onChange?.(value); }}
      >
        {/* Slim toolbar — no AI, no color pickers */}
        {!readOnly && (
          <FixedToolbar>
            <ComposerToolbarButtons />
          </FixedToolbar>
        )}

        <EditorContainer>
          <Editor variant="fullWidth" className="!px-4 !pt-3 !pb-8 !min-h-0" />
        </EditorContainer>

        {/* Fix invisible list markers */}
        <style>{`
          [data-plate-editor] [style*="list-style-type"] {
            padding-left: 1.5em;
          }
          [data-plate-editor] [style*="list-style-type"]::before {
            color: currentColor;
          }
          [data-plate-editor] ul, [data-plate-editor] ol {
            padding-left: 1.5em;
          }
          [data-plate-editor] ul { list-style-type: disc; }
          [data-plate-editor] ol { list-style-type: decimal; }
        `}</style>

        {!readOnly && (
          <>
            <FloatingToolbar>
              <FloatingToolbarButtons />
            </FloatingToolbar>
            {editorRef && <EditorWithMarkdown onReady={editorRef} />}
          </>
        )}
      </Plate>
    </DndProvider>
  );
}
