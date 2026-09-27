import type { Metadata } from "next";
import { History } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Downloads" };

const KIND_LABEL = { CV_PDF: "CV · PDF", CV_DOCX: "CV · Word", LETTER_PDF: "Carta · PDF", LETTER_DOCX: "Carta · Word", PHOTO_JPG: "Foto · JPG", PHOTO_PNG: "Foto · PNG", PRODUCT_FILE: "Kit" } as const;

export default async function DownloadsPage() {
  const user = await requireUser("/meu-espaco/downloads");
  const downloads = await db.download.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="Os meus downloads" description="Histórico dos últimos 100 ficheiros descarregados." />
      {downloads.length === 0 ? (
        <EmptyState icon={<History className="size-7" aria-hidden />} title="Ainda não descarregou ficheiros" description="Quando baixar um CV ou um kit, aparece aqui." />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {downloads.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                <Badge tone={d.kind === "PRODUCT_FILE" ? "success" : "brand"}>{KIND_LABEL[d.kind]}</Badge>
                <span className="min-w-0 flex-1 truncate font-medium">{d.label}</span>
                <time className="text-sm text-slate-500" dateTime={d.createdAt.toISOString()}>
                  {formatDateTime(d.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
