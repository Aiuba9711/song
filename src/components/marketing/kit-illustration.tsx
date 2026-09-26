/** Ilustração vetorial do kit (documentos empilhados) — substitui mockups pesados. */
export function KitIllustration({ className, accent = "#1d40d8" }: { className?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-label="Ilustração: modelos de CV, cartas e guias do kit">
      <defs>
        <linearGradient id="kbg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#eef4ff" />
          <stop offset="1" stopColor="#dbe6fe" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" rx="24" fill="url(#kbg)" />
      <g transform="translate(70 40) rotate(-8)">
        <rect width="120" height="160" rx="10" fill="#fff" stroke="#bfd3fe" />
        <rect x="14" y="16" width="60" height="8" rx="4" fill="#93b4fd" />
        <rect x="14" y="32" width="90" height="5" rx="2.5" fill="#dbe6fe" />
        <rect x="14" y="44" width="80" height="5" rx="2.5" fill="#dbe6fe" />
      </g>
      <g transform="translate(150 36) rotate(7)">
        <rect width="120" height="160" rx="10" fill="#fff" stroke="#bfd3fe" />
        <rect x="14" y="16" width="44" height="8" rx="4" fill="#0f9d58" opacity=".6" />
        <rect x="14" y="32" width="92" height="5" rx="2.5" fill="#e2e8f0" />
        <rect x="14" y="44" width="92" height="5" rx="2.5" fill="#e2e8f0" />
        <rect x="14" y="56" width="70" height="5" rx="2.5" fill="#e2e8f0" />
      </g>
      <g transform="translate(100 56)">
        <rect width="124" height="164" rx="10" fill="#fff" stroke="#cbd5e1" />
        <rect width="124" height="34" rx="10" fill={accent} />
        <rect y="24" width="124" height="10" fill={accent} />
        <circle cx="22" cy="17" r="9" fill="#fff" opacity=".85" />
        <rect x="38" y="11" width="56" height="6" rx="3" fill="#fff" />
        <rect x="38" y="21" width="36" height="4" rx="2" fill="#fff" opacity=".7" />
        {[48, 60, 72, 92, 104, 116, 136, 148].map((y, i) => (
          <rect key={y} x="14" y={y} width={i % 3 === 0 ? 50 : 96} height={i % 3 === 0 ? 6 : 4} rx="2" fill={i % 3 === 0 ? "#93b4fd" : "#e2e8f0"} />
        ))}
      </g>
      <g transform="translate(236 168)">
        <circle r="22" fill="#0f9d58" />
        <path d="m-9 0 6 6 12-13" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
