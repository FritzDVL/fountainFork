"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { FeedType } from "@/lib/forum/constants";

interface ThreadRef {
  rootPublicationId: string;
  feed: FeedType;
  title: string;
}

interface ComposerState {
  status: "closed" | "open";
  mode: "thread" | "reply";
  prefilledCategory?: string;
  threadRef?: ThreadRef;
}

interface ComposerActions {
  openNewThread: (category?: string) => void;
  openReply: (threadRef: ThreadRef) => void;
  close: () => void;
  state: ComposerState;
}

const ComposerContext = createContext<ComposerActions | null>(null);

const initialState: ComposerState = { status: "closed", mode: "thread" };

export function ComposerContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComposerState>(initialState);

  const openNewThread = useCallback((category?: string) => {
    setState({ status: "open", mode: "thread", prefilledCategory: category });
  }, []);

  const openReply = useCallback((threadRef: ThreadRef) => {
    setState({ status: "open", mode: "reply", threadRef });
  }, []);

  const close = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <ComposerContext.Provider value={{ state, openNewThread, openReply, close }}>
      {children}
    </ComposerContext.Provider>
  );
}

export function useComposer() {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error("useComposer must be used within ComposerContextProvider");
  return ctx;
}
