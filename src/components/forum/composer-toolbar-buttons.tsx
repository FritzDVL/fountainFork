"use client";

import { useEditorReadOnly } from "@udecode/plate/react";
import {
  BoldPlugin,
  CodePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from "@udecode/plate-basic-marks/react";
import { ListStyleType } from "@udecode/plate-indent-list";
import { ImagePlugin } from "@udecode/plate-media/react";
import {
  BoldIcon,
  Code2Icon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react";

import { IndentListToolbarButton } from "@/components/ui/indent-list-toolbar-button";
import { LinkToolbarButton } from "@/components/ui/link-toolbar-button";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { MediaToolbarButton } from "@/components/ui/media-toolbar-button";
import { MoreDropdownMenu } from "@/components/ui/more-dropdown-menu";
import { ToolbarGroup } from "@/components/ui/toolbar";

export function ComposerToolbarButtons() {
  const readOnly = useEditorReadOnly();

  if (readOnly) return null;

  return (
    <div className="flex w-full">
      <ToolbarGroup>
        <MarkToolbarButton nodeType={BoldPlugin.key} tooltip="Bold (⌘+B)">
          <BoldIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={ItalicPlugin.key} tooltip="Italic (⌘+I)">
          <ItalicIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={UnderlinePlugin.key} tooltip="Underline (⌘+U)">
          <UnderlineIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={StrikethroughPlugin.key} tooltip="Strikethrough">
          <StrikethroughIcon />
        </MarkToolbarButton>
        <MarkToolbarButton nodeType={CodePlugin.key} tooltip="Code (⌘+E)">
          <Code2Icon />
        </MarkToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <IndentListToolbarButton nodeType={ListStyleType.Disc} />
        <IndentListToolbarButton nodeType={ListStyleType.Decimal} />
      </ToolbarGroup>

      <ToolbarGroup>
        <LinkToolbarButton />
        <MediaToolbarButton nodeType={ImagePlugin.key} />
        <MoreDropdownMenu />
      </ToolbarGroup>
    </div>
  );
}
