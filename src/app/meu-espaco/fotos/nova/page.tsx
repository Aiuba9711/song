import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/guards";
import { PhotoUploader } from "@/photo/uploader";
import { maxUploadBytes } from "@/server/photos";

export const metadata: Metadata = { title: "Foto Profissional", robots: { index: false } };

const TIPS = [
  "De frente, com o rosto e os ombros visíveis.",
  "Boa luz, de preferência natural e de frente.",
  "Contra uma parede lisa e clara — facilita a troca de fundo.",
  "Sem filtros nem óculos escuros.",
];

export default async function NewPhotoPage() {
  await requireUser("/meu-espaco/fotos/nova");
  return (
    <>
      <Link href="/meu-espaco/fotos" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Minhas fotos
      </Link>
      <PageHeader title="Foto Profissional" description="Prepare a sua fotografia para uma candidatura profissional." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          <PhotoUploader maxBytes={maxUploadBytes()} />
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">Para um bom resultado</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {TIPS.map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-go-700" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </Card>
          <p className="flex gap-2 text-sm text-slate-600">
            <ShieldCheck className="size-5 shrink-0 text-go-700" aria-hidden />
            A fotografia fica privada na sua conta. Os metadados (localização GPS, modelo do telemóvel) são removidos. A edição é feita no próprio aparelho; nada é
            enviado a serviços externos nem usado para treinar modelos de IA.
          </p>
        </div>
      </div>
    </>
  );
}
