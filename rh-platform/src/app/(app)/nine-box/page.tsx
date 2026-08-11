import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import { getNineBox } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function NineBoxPage() {
  let cells;
  try {
    cells = await getNineBox();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Sucessao · Nine Box</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  const totalMapped = cells.reduce((acc, c) => acc + c.people.length, 0);
  const hipos = cells.slice(0, 3).reduce((acc, c) => acc + c.people.length, 0);

  return (
    <>
      <h1 className="page-title">Sucessao & Talentos · Nine Box</h1>
      <p className="page-subtitle">
        Matriz 9-Box (desempenho × potencial) a partir das avaliacoes de performance.
        {totalMapped > 0 && ` ${hipos} high potential(s) identificado(s).`}
      </p>

      {totalMapped === 0 ? (
        <div className="card">
          <p className="muted">
            Nenhuma avaliacao com desempenho e potencial ainda. Registre avaliacoes em{" "}
            <Link href="/performance">Performance</Link> (preencha nota e potencial).
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                textAlign: "center",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--muted)",
                padding: "8px 0",
              }}
            >
              Potencial →
            </div>
            <div style={{ flex: 1 }}>
              <div className="ninebox">
                {cells.map((cell) => (
                  <div key={cell.index} className={`ninebox-cell q-${cell.band}`}>
                    <div className="cell-title">{cell.title}</div>
                    {cell.people.map((p) => (
                      <Link
                        key={p.id}
                        href={`/colaboradores/${p.id}`}
                        className="ninebox-name"
                      >
                        {p.name}
                      </Link>
                    ))}
                    {cell.people.length === 0 && (
                      <span className="muted" style={{ fontSize: 11 }}>
                        —
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--muted)",
                  marginTop: 8,
                }}
              >
                Desempenho →
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
