import "server-only";
import type { OrderStatus, Prisma, Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function getDashboardStats() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [users, users30, cvs, cvs30, paidOrders, revenue, downloads, downloads30, activeProducts, recentOrders, recentUsers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since30 } } }),
    db.cV.count(),
    db.cV.count({ where: { createdAt: { gte: since30 } } }),
    db.order.count({ where: { status: "PAID" } }),
    db.order.aggregate({ where: { status: "PAID", currency: "MZN" }, _sum: { totalMinor: true } }),
    db.download.count(),
    db.download.count({ where: { createdAt: { gte: since30 } } }),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, number: true, customerName: true, totalMinor: true, currency: true, status: true, createdAt: true },
    }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, createdAt: true } }),
  ]);
  return {
    users,
    users30,
    cvs,
    cvs30,
    paidOrders,
    revenueMinor: revenue._sum.totalMinor ?? 0,
    downloads,
    downloads30,
    activeProducts,
    recentOrders,
    recentUsers,
  };
}

const PAGE_SIZE = 25;

export async function listUsers({ q, page }: { q?: string; page: number }) {
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }] }
    : {};
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { cvs: true, orders: { where: { status: "PAID" } } } },
      },
    }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listOrders({ status, page }: { status?: OrderStatus; page: number }) {
  const where: Prisma.OrderWhereInput = status ? { status } : {};
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        status: true,
        totalMinor: true,
        currency: true,
        createdAt: true,
        items: { select: { productName: true } },
        payments: { select: { provider: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export class AdminError extends Error {}

/** Alteração de papel com salvaguardas (não remover o último ADMIN, nem o próprio). */
export async function changeUserRole(actorId: string, userId: string, role: Role) {
  if (actorId === userId) throw new AdminError("Não pode alterar o seu próprio papel.");
  const target = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) throw new AdminError("Utilizador não encontrado.");
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
    if (admins <= 1) throw new AdminError("Tem de existir pelo menos um administrador.");
  }
  await db.user.update({ where: { id: userId }, data: { role } });
}

export async function setUserActive(actorId: string, userId: string, isActive: boolean) {
  if (actorId === userId) throw new AdminError("Não pode desativar a sua própria conta.");
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { isActive } }),
    ...(isActive ? [] : [db.session.deleteMany({ where: { userId } })]),
  ]);
}
