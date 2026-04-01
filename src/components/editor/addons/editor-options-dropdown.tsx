"use client";

import { useAuthenticatedUser } from "@lens-protocol/react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
// DISABLED: Draft sharing feature — not used in forum mode
// import { useState } from "react";
// import { DraftShareModal } from "@/components/draft/draft-share-modal";
// import { LinkIcon } from "@/components/icons/link";
import { MenuIcon } from "@/components/icons/menu";
import { AnimatedMenuItem } from "@/components/navigation/animated-item";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, useOpenState } from "@/components/ui/dropdown-menu";

export const EditorOptionsDropdown = ({
  documentId,
  collaborative,
}: {
  documentId: string;
  collaborative: boolean;
}) => {
  const { open, onOpenChange } = useOpenState();
  // DISABLED: Draft sharing feature
  // const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { data: user } = useAuthenticatedUser();

  // DISABLED: Draft sharing feature
  // const onShare = () => {
  //   setIsShareModalOpen(true);
  // };
  const searchParams = useSearchParams();
  const isPreview = searchParams.has("preview");

  const onPreview = () => {
    const currentUrl = window.location.pathname;
    const newUrl = isPreview ? currentUrl : `${currentUrl}?preview`;

    if (isPreview) {
      window.history.pushState({}, "", newUrl);
    } else {
      window.open(newUrl, "_blank");
    }

    onOpenChange(false);
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="outline-none">
          <MenuIcon animate={open} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-48" portal align="end">
        {/* DISABLED: Draft sharing feature
        <AnimatedMenuItem icon={LinkIcon} onClick={onShare}>
          Share draft
        </AnimatedMenuItem>
        */}
        <AnimatedMenuItem icon={isPreview ? EyeOffIcon : EyeIcon} onClick={onPreview}>
          {isPreview ? "Exit preview" : "Preview post"}
        </AnimatedMenuItem>
      </DropdownMenuContent>
      {/* DISABLED: Draft sharing feature
      <DraftShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={documentId}
        collaborative={collaborative}
      />
      */}
    </DropdownMenu>
  );
};
