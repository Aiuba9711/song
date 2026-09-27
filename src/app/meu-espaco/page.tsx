import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, FilePlus2, FileText, Mail, MessageSquareText, Package, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { listUserCvs } from "@/server/cv";
import { listUserProducts } from "@/server/orders";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [cvs, products, downloads] = await Promise.all([
    listUserCvs(user.id),
    listUserProducts(user.id),
    db.download.count({ where: { userId: user.id } }),
  ]);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      {params["bem-vindo"] && (
        <Alert tone="success" title="Conta criada com sucesso!">
          Comece por criar o seu primeiro CV — leva poucos minutos.
        </Alert>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Olá, {firstName} 👋</h1>
        <p className="mt-1 text-slate-600">O que quer fazer hoje?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/meu-espaco/cvs/novo" className="group">
          <Card className="flex h-full items-center gap-4 bg-brand-700 p-5 text-white transition-colors group-hover:bg-brand-800">
            <FilePlus2 className="size-8 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Criar novo CV</p>
              <p className="text-sm text-brand-100">Passo a passo, com dicas</p>
            </div>
          </Card>
        </Link>
        <Link href="/meu-espaco/cvs" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-shadow group-hover:shadow-lift">
            <FileText className="size-8 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="font-semibold">Meus CVs</p>
              <p className="text-sm text-slate-600">{cvs.length === 1 ? "1 CV" : `${cvs.length} CVs`}</p>
            </div>
          </Card>
        </Link>
        <Link href="/meu-espaco/cartas" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-shadow group-hover:shadow-lift">
            <Mail className="size-8 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="font-semibold">Cartas</p>
              <p className="text-sm text-slate-600">Candidatura e motivação</p>
            </div>
          </Card>
        </Link>
        <Link href="/meu-espaco/mensagens" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-shadow group-hover:shadow-lift">
            <MessageSquareText className="size-8 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="font-semibold">Email e WhatsApp</p>
              <p className="text-sm text-slate-600">Modelos prontos a copiar</p>
            </div>
          </Card>
        </Link>
        <Link href="/meu-espaco/fotos" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-shadow group-hover:shadow-lift">
            <Camera className="size-8 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="font-semibold">Foto Profissional</p>
              <p className="text-sm text-slate-600">Prepare a sua fotografia para o CV</p>
            </div>
          </Card>
        </Link>
        <Link href="/meu-espaco/kits" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-shadow group-hover:shadow-lift">
            <Package className="size-8 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="font-semibold">Meus kits</p>
              <p className="text-sm text-slate-600">
                {products.length === 1 ? "1 kit" : `${products.length} kits`} · {downloads} downloads
              </p>
            </div>
          </Card>
        </Link>
      </div>

      <section aria-labelledby="recentes">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recentes" className="text-lg font-semibold">
            CVs recentes
          </h2>
          {cvs.length > 0 && (
            <Link href="/meu-espaco/cvs" className="text-sm font-semibold text-brand-700 hover:underline">
              Ver todos
            </Link>
          )}
        </div>
        {cvs.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-slate-600">Ainda não criou nenhum CV.</p>
            <ButtonLink href="/meu-espaco/cvs/novo" className="mt-4">
              Criar o meu primeiro CV
            </ButtonLink>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {cvs.slice(0, 4).map((cv) => (
              <li key={cv.id}>
                <Link href={`/meu-espaco/cvs/${cv.id}`} className="group block">
                  <Card className="flex items-center gap-4 p-4 transition-shadow group-hover:shadow-lift">
                    <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: cv.template?.accentColor ?? "#1d40d8" }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{cv.title}</p>
                      <p className="truncate text-sm text-slate-600">
                        {cv.template?.name ?? "Sem modelo"} · atualizado {formatDate(cv.updatedAt)}
                      </p>
                    </div>
                    <ArrowRight className="size-5 text-slate-400 group-hover:text-brand-700" aria-hidden />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {products.length === 0 && (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Sparkles className="size-8 shrink-0 text-go-600" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">Modelo gratuito de CV + carta de candidatura</p>
            <p className="text-sm text-slate-600">Descarregue em Word e adapte com as suas informações.</p>
          </div>
          <ButtonLink href="/kits/modelo-gratuito" variant="success">
            Obter grátis
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
