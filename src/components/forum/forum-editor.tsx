"use client";

import { createPlateEditor, Plate, usePlateEditor } from "@udecode/plate/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useEffect, useRef } from "react";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FloatingToolbar } from "@/components/ui/floating-toolbar";
import { FloatingToolbarButtons } from "@/components/ui/floating-toolbar-buttons";
import { getEditorPlugins } from "@/components/editor/plugins";
import { getRichElements } from "@/components/editor/elements";

interface ForumEditorProps {
  readOnly?: boolean;
  value?: string;
  onChange?: (value: any) => void;
}

export function ForumEditor({ readOnly = false, value, onChange }: ForumEditorProps) {
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
          <Editor variant="fullWidth" />
        </EditorContainer>

        {!readOnly && (
          <FloatingToolbar>
            <FloatingToolbarButtons />
          </FloatingToolbar>
        )}
      </Plate>
    </DndProvider>
  );
}
