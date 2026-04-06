"use client";

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
  const parsedValue = value ? JSON.parse(value) : [{ type: "p", children: [{ text: "" }] }];

  // Get plugins and filter out Title/Subtitle/Dnd for forum editor
  const allPlugins = getEditorPlugins("forum-editor", undefined, readOnly, false);
  const forumPlugins = allPlugins.filter((p: any) => {
    const key = p?.key || p?.plugin?.key || "";
    return key !== "title" && key !== "subtitle" && key !== "dnd";
  });

  const editor = createPlateEditor({
    plugins: forumPlugins,
    override: { components: getRichElements() },
    value: parsedValue,
  });

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
          <Editor variant="fullWidth" className="!px-0" />
        </EditorContainer>

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
