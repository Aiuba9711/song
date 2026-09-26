/** Estado partilhado dos mocks de next/headers (cookies e cabeçalhos do pedido). */
export const cookieJar = new Map<string, string>();
export const requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.10", "user-agent": "vitest", host: "localhost:3000" });

export function resetCookies() {
  cookieJar.clear();
}
