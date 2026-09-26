"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { changeRoleAction, toggleActiveAction, type UserActionState } from "./actions";

const initial: UserActionState = {};

export function UserRowActions({ userId, role, isActive, isSelf }: { userId: string; role: string; isActive: boolean; isSelf: boolean }) {
  const [roleState, roleAction] = useActionState(changeRoleAction, initial);
  const [activeState, activeAction] = useActionState(toggleActiveAction, initial);
  if (isSelf) return <span className="text-xs text-slate-500">A sua conta</span>;
  const error = roleState.error ?? activeState.error;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={roleAction} className="flex items-center gap-1">
          <input type="hidden" name="userId" value={userId} />
          <label htmlFor={`role-${userId}`} className="sr-only">
            Papel
          </label>
          <select id={`role-${userId}`} name="role" defaultValue={role} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="USER">Utilizador</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <SubmitButton variant="outline" size="sm">
            Aplicar
          </SubmitButton>
        </form>
        <form action={activeAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="active" value={isActive ? "false" : "true"} />
          <SubmitButton variant="ghost" size="sm" className={isActive ? "text-red-700" : "text-go-700"}>
            {isActive ? "Desativar" : "Ativar"}
          </SubmitButton>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
