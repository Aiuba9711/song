import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { appUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Emprego Fácil MZ — Cria o teu CV profissional",
    template: "%s | Emprego Fácil MZ",
  },
  description:
    "Modelos de CV, cartas de candidatura, preparação para entrevistas e ferramentas práticas para quem procura emprego em Moçambique.",
  applicationName: "Emprego Fácil MZ",
  keywords: ["CV", "curriculum vitae", "emprego Moçambique", "carta de candidatura", "modelo de CV", "Maputo"],
  authors: [{ name: "Emprego Fácil MZ" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Emprego Fácil", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "pt_MZ",
    siteName: "Emprego Fácil MZ",
    title: "Emprego Fácil MZ — O teu próximo emprego começa com uma boa candidatura",
    description: "Cria CVs profissionais, cartas de candidatura e prepara-te para entrevistas.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Emprego Fácil MZ" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#1d40d8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <body className="min-h-dvh">
        <a href="#conteudo" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
          Saltar para o conteúdo
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
