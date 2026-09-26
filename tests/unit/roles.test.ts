import { describe, expect, it } from "vitest";
import { can } from "@/lib/auth/roles";

describe("autorização por papel", () => {
  it("USER não acede ao admin", () => {
    expect(can("USER", "admin.access")).toBe(false);
    expect(can("USER", "products.manage")).toBe(false);
  });
  it("EDITOR gere modelos mas não produtos, utilizadores nem definições", () => {
    expect(can("EDITOR", "admin.access")).toBe(true);
    expect(can("EDITOR", "templates.manage")).toBe(true);
    expect(can("EDITOR", "products.manage")).toBe(false);
    expect(can("EDITOR", "users.manage")).toBe(false);
    expect(can("EDITOR", "settings.manage")).toBe(false);
    expect(can("EDITOR", "orders.view")).toBe(false);
  });
  it("ADMIN tem todas as permissões", () => {
    for (const p of ["admin.access", "templates.manage", "content.manage", "products.manage", "orders.view", "users.manage", "settings.manage"] as const) {
      expect(can("ADMIN", p)).toBe(true);
    }
  });
  it("sem sessão não tem permissões", () => {
    expect(can(null, "admin.access")).toBe(false);
  });
});
