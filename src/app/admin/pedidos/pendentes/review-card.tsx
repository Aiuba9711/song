"use client";

import { useActionState, useId, useRef } from "react";
import { CheckCircle2, FileSearch, RotateCcw, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewPaymentAction, type ReviewState } from "./actions";

/** Botões de decisão: confirmar (com diálogo) ou rejeitar / pedir novo comprovativo (com motivo). */
export function ReviewActions({ paymentId, orderNumber, amount }: { paymentId: string; orderNumber: string; amount: string }) {
  const [state, action] = useActionState(reviewPaymentAction, {} as ReviewState);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();

  return (
    <div className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <button type="button" className={buttonClass("success", "md", "w-full")} onClick={() => dialog.current?.showModal()}>
        <CheckCircle2 className="size-5" aria-hidden /> Confirmar pagamento
      </button>
      <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[min(92vw,28rem)] rounded-2xl p-0 shadow-lift backdrop:bg-slate-900/50">
        <form action={action} className="p-6" onSubmit={() => dialog.current?.close()}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <input type="hidden" name="decision" value="CONFIRM" />
          <h2 id={titleId} className="text-lg font-semibold">
            Confirmar o pagamento do pedido {orderNumber}?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Confirme apenas depois de verificar no extrato do operador que recebeu <strong>{amount}</strong> com o código indicado. O acesso é libertado de imediato e a ação fica registada.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={buttonClass("outline")} onClick={() => dialog.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className={buttonClass("success")}>
              Sim, confirmar
            </button>
          </div>
        </form>
      </dialog>

      <form action={action} className="space-y-2 rounded-xl border border-slate-200 p-3">
        <input type="hidden" name="paymentId" value={paymentId} />
        <label htmlFor={noteId} className="block text-sm font-medium text-slate-700">
          Motivo / mensagem para o cliente
        </label>
        <Textarea id={noteId} name="note" rows={2} maxLength={500} className="min-h-0" placeholder="Ex.: Não encontrámos a transação com este código. Envie a captura do SMS." />
        <div className="grid gap-2 sm:grid-cols-2">
          <SubmitButton name="decision" value="REQUEST_NEW_PROOF" variant="outline" size="sm" icon={<RotateCcw className="size-4" aria-hidden />}>
            Pedir novo comprovativo
          </SubmitButton>
          <SubmitButton name="decision" value="REJECT" variant="danger" size="sm" icon={<XCircle className="size-4" aria-hidden />}>
            Rejeitar pagamento
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function ProofLink({ paymentId }: { paymentId: string }) {
  return (
    <a href={`/api/admin/payments/${paymentId}/proof`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 underline">
      <FileSearch className="size-4" aria-hidden /> Ver comprovativo
    </a>
  );
}
