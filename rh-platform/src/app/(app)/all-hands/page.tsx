import { DbNotice } from "@/components/DbNotice";
import { DbUnavailableError } from "@/lib/collaborators";
import {
  formatFullDate,
  formatShortDate,
  listAllHands,
  whenLabel,
  type AllHandsItem,
} from "@/lib/allhands";
import { AddAllHandsForm } from "./AddAllHandsForm";
import { RemoveButton } from "./RemoveButton";

export const dynamic = "force-dynamic";

export default async function AllHandsPage() {
  let items: AllHandsItem[];
  try {
    items = await listAllHands();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return (
        <>
          <h1 className="page-title">All Hands</h1>
          <DbNotice />
        </>
      );
    }
    throw err;
  }

  const upcoming = items.filter((i) => !i.past);
  const past = items.filter((i) => i.past).reverse();
  const next = upcoming[0] ?? null;

  return (
    <>
      <div className="row-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">All Hands</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Calendario das reunioes gerais da empresa
          </p>
        </div>
        <AddAllHandsForm />
      </div>

      {next && (
        <div className="allhands-next">
          <div>
            <div className="ah-eyebrow">Proximo all hands</div>
            <div className="ah-date">{formatFullDate(next.date)}</div>
            {next.title && <div className="ah-title">{next.title}</div>}
          </div>
          <div className="ah-count">
            <span className="pill green">{whenLabel(next.daysUntil)}</span>
          </div>
        </div>
      )}

      {upcoming.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Nenhuma reuniao agendada. Adicione a proxima em &quot;Nova reuniao&quot;.
          </p>
        </div>
      ) : (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Proximas ({upcoming.length})</h3>
          {upcoming.map((i) => (
            <div key={i.id} className="ah-row">
              <span className="ah-chip">{formatShortDate(i.date)}</span>
              <span className="ah-row-main">
                <span className="ah-row-date">{formatFullDate(i.date)}</span>
                {i.title && <span className="muted" style={{ fontSize: 13 }}>{i.title}</span>}
              </span>
              <span className={`pill ${i.daysUntil <= 7 ? "amber" : "gray"}`}>
                {whenLabel(i.daysUntil)}
              </span>
              <RemoveButton id={i.id} />
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Realizadas ({past.length})</h3>
          {past.map((i) => (
            <div key={i.id} className="ah-row past">
              <span className="ah-chip">{formatShortDate(i.date)}</span>
              <span className="ah-row-main">
                <span className="ah-row-date">{formatFullDate(i.date)}</span>
                {i.title && <span className="muted" style={{ fontSize: 13 }}>{i.title}</span>}
              </span>
              <span className="pill gray">Realizado</span>
              <RemoveButton id={i.id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
