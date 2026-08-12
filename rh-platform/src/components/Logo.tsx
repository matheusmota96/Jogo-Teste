/**
 * Logo RH B4you (wordmark em SVG, autocontida).
 * `tone="light"` para fundos escuros (texto branco); `tone="dark"` (padrao)
 * para fundos claros (texto azul-marinho). O "4" usa o verde-agua da marca.
 *
 * Observacao: este e um wordmark aproximado. Para a marca oficial exata,
 * substitua o conteudo deste componente pelo arquivo de logo da B4you.
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
      viewBox="0 0 210 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="RH B4you"
    >
      <text
        x="0"
        y="41"
        fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="42"
        letterSpacing="-1.5"
      >
        <tspan fill={ink}>RH B</tspan>
        <tspan fill={teal}>4</tspan>
        <tspan fill={ink}>you</tspan>
      </text>
    </svg>
  );
}
