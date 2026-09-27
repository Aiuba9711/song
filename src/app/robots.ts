import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/meu-espaco", "/admin", "/checkout", "/api", "/entrar", "/registar", "/recuperar-senha", "/redefinir-senha"] }],
    sitemap: appUrl("/sitemap.xml"),
  };
}
