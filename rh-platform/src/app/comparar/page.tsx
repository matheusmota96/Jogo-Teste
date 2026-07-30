import Link from "next/link";
import { DbNotice } from "@/components/DbNotice";
import { DiscBadge } from "@/components/DiscBadge";
import { DiscBars } from "@/components/DiscBars";
import { listCollaborators, DbUnavailableError } from "@/lib/collaborators";
import { compatibility } from "@/lib/disc/score";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  let collaborators;
  try {
    collaborators = await listCollaborators();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">Comparar perfis</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  const mapped = collaborators.filter((c) => c.latest);
  const left = mapped.find((c) => c.id === a) ?? null;
  const right = mapped.find((c) => c.id === b) ?? null;
  const score =
    left?.latest && right?.latest
      ? compatibility(left.latest.scores, right.latest.scores)
      : null;

  const options = (selected?: string) =>
    mapped.map((c) => (
      <option key={c.id} value={c.id}>
        {c.name} ({c.latest?.primary})
      </option>
    ));

  return (
    <>
      <h1 className="page-title">Comparar perfis</h1>
      <p className="page-subtitle">
        Compatibilidade comportamental entre dois colaboradores (base para fit de equipe e
        gestor x liderado).
      </p>

      {mapped.length < 2 ? (
        <div className="card">
          <p className="muted">
            E preciso ter pelo menos 2 colaboradores com DNA Comportamental. Aplique o{" "}
            <Link href="/profiler">Profiler</Link> primeiro.
          </p>
        </div>
      ) : (
        <>
          <form className="card" method="get" style={{ marginBottom: 20 }}>
            <div className="grid cols-2">
              <div className="field">
                <label>Colaborador A</label>
                <select name="a" defaultValue={a ?? ""}>
                  <option value="">Selecione...</option>
                  {options(a)}
                </select>
              </div>
              <div className="field">
                <label>Colaborador B</label>
                <select name="b" defaultValue={b ?? ""}>
                  <option value="">Selecione...</option>
                  {options(b)}
                </select>
              </div>
            </div>
            <button className="btn" type="submit">
              Comparar
            </button>
          </form>

          {left?.latest && right?.latest && (
            <>
              <div className="card" style={{ marginBottom: 20, textAlign: "center" }}>
                <div className="stat-label">Compatibilidade comportamental</div>
                <div className="stat" style={{ fontSize: 48, color: "var(--brand)" }}>
                  {score}%
                </div>
                <p className="muted" style={{ margin: 0 }}>
                  {score! >= 75
                    ? "Alta afinidade de estilos."
                    : score! >= 50
                    ? "Afinidade moderada — estilos complementares."
                    : "Estilos bem distintos — atencao a comunicacao."}
                </p>
              </div>

              <div className="grid cols-2">
                {[left, right].map((c) => (
                  <div className="card" key={c.id}>
                    <div className="row-between" style={{ marginBottom: 16 }}>
                      <div>
                        <strong>{c.name}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {c.role ?? "-"}
                        </div>
                      </div>
                      <DiscBadge primary={c.latest!.primary} label={c.latest!.profileName} />
                    </div>
                    <DiscBars scores={c.latest!.scores} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
