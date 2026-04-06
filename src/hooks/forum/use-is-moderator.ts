"use client";

import { useEffect, useState } from "react";
import { getCookie } from "cookies-next";
import { getTokenClaims } from "@/lib/auth/get-token-claims";

export function useIsModerator() {
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const appToken = getCookie("appToken") as string | undefined;
    if (appToken) {
      const claims = getTokenClaims(appToken);
      setIsModerator(!!claims?.metadata?.isAdmin);
    }
    setIsLoading(false);
  }, []);

  return { isModerator, isLoading };
}
