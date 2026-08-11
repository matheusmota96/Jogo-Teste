import Link from "next/link";
import { notFound } from "next/navigation";
import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  getReview,
  scoreToPct,
  REVIEW_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
} from "@/lib/performance";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let review;
  try {
    review = await getReview(id);
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return <DbNotice />;
    }
    throw err;
  }

  if (!review) notFound();

  return (
    <>
      <Link className="btn ghost" href="/performance" style={{ paddingLeft: 0 }}>
        ← Performance
      </Link>

      <div className="row-between" style={{ margin: "8px 0 24px" }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            {review.collaborator.name}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {REVIEW_TYPE_LABELS[review.type]} · Ciclo {review.cycle}
            {review.reviewer ? ` · Avaliador: ${review.reviewer.name}` : ""}
          </p>
        </div>
        <span className={`pill ${REVIEW_STATUS_COLORS[review.status]}`}>
          {REVIEW_STATUS_LABELS[review.status]}
        </span>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat">
            {review.overallScore !== null ? `${review.overallScore}/5` : "-"}
          </div>
          <div className="stat-label">Nota geral (desempenho)</div>
        </div>
        <div className="card">
          <div className="stat">
            {review.potentialScore !== null ? `${review.potentialScore}/5` : "-"}
          </div>
          <div className="stat-label">Potencial</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Competências avaliadas</h3>
        {review.ratings.length === 0 ? (
          <p className="muted">Nenhuma competência avaliada.</p>
        ) : (
          review.ratings.map((r) => (
            <div key={r.id} style={{ marginBottom: 14 }}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{r.competencyName}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {r.score}/5
                </span>
              </div>
              <div className="meter">
                <div style={{ width: `${scoreToPct(r.score)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      {review.notes && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Observações</h3>
          <p style={{ fontSize: 14, whiteSpace: "pre-wrap", margin: 0 }}>{review.notes}</p>
        </div>
      )}
    </>
  );
}
