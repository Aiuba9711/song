import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LetterEditor } from "@/letters/editor";
import { requireUser } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { getAiStatus } from "@/server/ai";
import { canDownloadLetter, getLetterPrice } from "@/server/checkout";
import { getUserLetter, toLetterContent } from "@/server/letters";

export const metadata: Metadata = { title: "Editar carta" };

export default async function EditLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-espaco/cartas/${id}/editar`);
  const letter = await getUserLetter(user.id, id);
  if (!letter) notFound();
  const [unlocked, price, aiStatus] = await Promise.all([canDownloadLetter(user.id, id), getLetterPrice(), getAiStatus(user.id)]);
  return (
    <LetterEditor
      letterId={letter.id}
      initial={toLetterContent(letter)}
      date={letter.updatedAt.toISOString()}
      aiStatus={aiStatus}
      unlocked={unlocked}
      priceLabel={formatMoney(price.priceMinor, price.currency)}
    />
  );
}
