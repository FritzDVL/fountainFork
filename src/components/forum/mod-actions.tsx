"use client";

import { Pin, Lock, Trash2 } from "lucide-react";
import { useIsModerator } from "@/hooks/forum/use-is-moderator";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ThreadModActionsProps {
  threadId: string;
  isPinned: boolean;
  isLocked: boolean;
}

export function ThreadModActions({ threadId, isPinned, isLocked }: ThreadModActionsProps) {
  const { isModerator } = useIsModerator();
  const router = useRouter();

  if (!isModerator) return null;

  const handleAction = async (action: string) => {
    const res = await fetch(`/api/forum/threads/${threadId}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      toast.success(`Thread ${action}${action.endsWith("e") ? "d" : "ed"}`);
      router.refresh();
    } else {
      toast.error("Action failed");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => handleAction(isPinned ? "unpin" : "pin")}>
        <Pin className={`h-3.5 w-3.5 ${isPinned ? "text-primary" : ""}`} />
        <span className="text-xs ml-1">{isPinned ? "Unpin" : "Pin"}</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleAction(isLocked ? "unlock" : "lock")}>
        <Lock className={`h-3.5 w-3.5 ${isLocked ? "text-primary" : ""}`} />
        <span className="text-xs ml-1">{isLocked ? "Unlock" : "Lock"}</span>
      </Button>
    </div>
  );
}

interface ReplyModActionsProps {
  replyId: string;
}

export function ReplyModActions({ replyId }: ReplyModActionsProps) {
  const { isModerator } = useIsModerator();
  const router = useRouter();

  if (!isModerator) return null;

  const handleHide = async () => {
    const res = await fetch(`/api/forum/replies/${replyId}/moderate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("Reply hidden");
      router.refresh();
    } else {
      toast.error("Action failed");
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleHide} className="text-muted-foreground hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
      <span className="text-xs ml-1">Hide</span>
    </Button>
  );
}
