import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const session = await requireUser("/meu-espaco/perfil");
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { name: true, email: true, phone: true, marketingConsent: true, createdAt: true, profile: { select: { headline: true, location: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="O meu perfil" description={`Membro desde ${formatDate(user.createdAt)}.`} />
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">Dados pessoais</h2>
        <ProfileForm
          defaults={{
            name: user.name,
            email: user.email,
            phone: user.phone ? `+${user.phone}` : "",
            headline: user.profile?.headline ?? "",
            location: user.profile?.location ?? "",
            marketingConsent: user.marketingConsent,
          }}
        />
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">Segurança</h2>
        <PasswordForm />
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Sessão</h2>
        <form action={logoutAction} className="mt-3">
          <Button type="submit" variant="outline" icon={<LogOut className="size-4" aria-hidden />}>
            Sair da conta
          </Button>
        </form>
      </Card>
      <Card className="border-red-200 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-red-700">Eliminar conta</h2>
        <p className="mt-1 mb-4 text-sm text-slate-600">
          Elimina permanentemente a conta, os CVs, as fotografias e o histórico de downloads. Os registos de pedidos pagos podem ser mantidos por obrigações legais. Esta ação não pode ser anulada.
        </p>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
