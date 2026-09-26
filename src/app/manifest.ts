import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Emprego Fácil MZ",
    short_name: "Emprego Fácil",
    description: "Cria CVs profissionais, cartas de candidatura e prepara-te para entrevistas.",
    lang: "pt-MZ",
    start_url: "/?origem=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1d40d8",
    categories: ["business", "productivity", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Criar CV", url: "/meu-espaco/cvs/novo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Meus CVs", url: "/meu-espaco/cvs", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
