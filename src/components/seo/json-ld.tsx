/** Dados estruturados (schema.org). Escapa "<" para impedir injeção de HTML a partir de conteúdo do admin. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
