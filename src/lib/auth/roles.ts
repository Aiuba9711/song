import type { Role } from "@/generated/prisma/enums";

/**
 * Permissões por papel. ADMIN tem tudo; EDITOR gere conteúdo (modelos, blog);
 * USER apenas os seus próprios dados.
 */
export const PERMISSIONS = {
  "admin.access": ["ADMIN", "EDITOR"],
  "templates.manage": ["ADMIN", "EDITOR"],
  "content.manage": ["ADMIN", "EDITOR"],
  "products.manage": ["ADMIN"],
  "orders.view": ["ADMIN"],
  "users.manage": ["ADMIN"],
  "settings.manage": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  USER: "Utilizador",
  EDITOR: "Editor",
  ADMIN: "Administrador",
};
