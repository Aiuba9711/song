import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-slate-600">{description}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
    </>
  );
}
