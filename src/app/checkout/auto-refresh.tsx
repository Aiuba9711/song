"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza a página periodicamente enquanto o pagamento é verificado (leve: só o RSC). */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
