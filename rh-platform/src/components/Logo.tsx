/**
 * Logo B4you (recriada em SVG, autocontida).
 * `tone="light"` para fundos escuros (texto branco); `tone="dark"` (padrao)
 * para fundos claros (texto azul-marinho). O simbolo "+" mantem o verde-agua
 * da marca em ambos.
 */
export function Logo({
  height = 32,
  tone = "dark",
}: {
  height?: number;
  tone?: "dark" | "light";
}) {
  const ink = tone === "light" ? "#ffffff" : "#0a0a28";
  const teal = "#31bd93";
  return (
    <svg
      height={height}
      viewBox="0 0 262 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="RH B4you"
    >
      {/* Simbolo: quadrado arredondado com "+" */}
      <rect x="0" y="8" width="48" height="48" rx="13" fill={teal} />
      <rect x="20" y="20" width="8" height="24" rx="2.5" fill="#ffffff" />
      <rect x="12" y="28" width="24" height="8" rx="2.5" fill="#ffffff" />
      {/* Wordmark */}
      <text
        x="60"
        y="45"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="40"
        letterSpacing="-1.5"
      >
        <tspan fill={ink}>RH B</tspan>
        <tspan fill={teal}>4</tspan>
        <tspan fill={ink}>you</tspan>
      </text>
    </svg>
  );
}
