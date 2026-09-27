"use client";

/**
 * Erro no próprio layout raiz (raro): substitui a página inteira, por isso inclui <html> e <body>
 * e usa estilos inline (o CSS da aplicação pode não ter carregado).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-MZ">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Algo correu mal</h1>
          <p style={{ maxWidth: 360, color: "#475569", margin: 0 }}>
            Ocorreu um erro inesperado. Os seus dados guardados não foram afetados.
            {error.digest && <span style={{ display: "block", fontSize: 12, marginTop: 4 }}>Código: {error.digest}</span>}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, border: 0, background: "#1d40d8", color: "#fff", fontWeight: 600 }}>
              Tentar novamente
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- o router pode não estar disponível aqui */}
            <a href="/" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 18px", borderRadius: 12, border: "1px solid #cbd5e1", color: "#0f172a", textDecoration: "none", fontWeight: 600 }}>
              Ir para o início
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
