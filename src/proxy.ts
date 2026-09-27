import { NextResponse, type NextRequest } from "next/server";

/**
 * Verificação rápida (sem BD): rotas privadas sem cookie de sessão vão para /entrar.
 * A validação real da sessão e dos papéis acontece SEMPRE no servidor (layouts, ações, rotas).
 */
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-efmz_session" : "efmz_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(COOKIE)) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/entrar";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/meu-espaco/:path*", "/admin/:path*", "/checkout/:path*", "/checkout"],
};
