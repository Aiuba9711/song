"use client";

import { Button } from "@/components/ui/button";

export function OfflineRetry() {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      Tentar novamente
    </Button>
  );
}
