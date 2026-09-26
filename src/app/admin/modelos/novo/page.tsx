import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { createTemplateAction } from "../actions";
import { CATEGORY_OPTIONS, LAYOUT_OPTIONS } from "../options";
import { TemplateForm } from "../template-form";

export const metadata: Metadata = { title: "Novo modelo" };

export default async function NewTemplatePage() {
  await requirePermission("templates.manage");
  return (
    <>
      <PageHeader title="Novo modelo de CV" />
      <TemplateForm
        action={createTemplateAction}
        categories={CATEGORY_OPTIONS}
        layouts={LAYOUT_OPTIONS}
        submitLabel="Criar modelo"
        defaults={{ name: "", slug: "", description: "", category: "GERAL", layout: "CLASSICO", accentColor: "#1d40d8", sortOrder: 100, isActive: false, isPremium: false }}
      />
    </>
  );
}
