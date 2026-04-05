"use client";

import { createPlateEditor, Plate, useEditorPlugin, useEditorRef } from "@udecode/plate/react";
import { MarkdownPlugin } from "@udecode/plate-markdown";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FloatingToolbar } from "@/components/ui/floating-toolbar";
import { FloatingToolbarButtons } from "@/components/ui/floating-toolbar-buttons";
import { getEditorPlugins } from "@/components/editor/plugins";
import { getRichElements } from "@/components/editor/elements";
import { useImperativeHandle, forwardRef } from "react";

export interface ForumEditorHandle {
  getContentJson: () => any;
  getContentMarkdown: () => string;
}

interface ForumEditorProps {
  readOnly?: boolean;
  value?: string;
  onChange?: (value: any) => void;
}

function EditorWithMarkdown({ onReady }: { onReady: (handle: ForumEditorHandle) => void }) {
  const editor = useEditorRef();
  const { api } = useEditorPlugin(MarkdownPlugin);

  // Expose methods to parent
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

export function ForumEditor({ readOnly = false, value, onChange, editorRef }: ForumEditorProps & { editorRef?: (handle: ForumEditorHandle) => void }) {
  const parsedValue = value ? JSON.parse(value) : [{ type: "p", children: [{ text: "" }] }];

  const editor = createPlateEditor({
    plugins: [...getEditorPlugins("forum-editor", undefined, readOnly, false)],
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
