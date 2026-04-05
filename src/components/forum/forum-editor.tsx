"use client";

import { createPlateEditor, Plate } from "@udecode/plate/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
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
          {/* Override fullWidth padding: px-6 sm:px-16 md:px-24 → px-0 */}
          <Editor variant="fullWidth" className="!px-0 !sm:px-0 !md:px-0" />
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
