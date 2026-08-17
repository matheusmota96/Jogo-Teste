"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getComemorativas, MONTH_NAMES_PT, WEEKDAYS_PT } from "@/lib/calendar";

export type BirthdayEvent = { id: string; name: string; month: number; day: number };
export type AllHandsEvent = { id: string; title: string | null; year: number; month: number; day: number };

export function Calendar({
  birthdays,
  allHands,
}: {
  birthdays: BirthdayEvent[];
  allHands: AllHandsEvent[];
}) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState<{ y: number; m: number; d: number }>({
    y: today.getFullYear(),
    m: today.getMonth(),
    d: today.getDate(),
  });

  const comemorativas = useMemo(() => getComemorativas(view.y), [view.y]);

  const month1 = view.m + 1;
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  function eventsFor(day: number) {
    const bdays = birthdays.filter((b) => b.month === month1 && b.day === day);
    const coms = comemorativas.filter((c) => c.month === month1 && c.day === day);
    const ahs = allHands.filter((a) => a.year === view.y && a.month === month1 && a.day === day);
    return { bdays, coms, ahs };
  }

  function prevMonth() {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  }
  function nextMonth() {
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  }
  function goToday() {
    setView({ y: today.getFullYear(), m: today.getMonth() });
    setSel({ y: today.getFullYear(), m: today.getMonth(), d: today.getDate() });
  }

  const selEvents = sel.m === view.m && sel.y === view.y ? eventsFor(sel.d) : { bdays: [], coms: [], ahs: [] };
  const hasSelEvents = selEvents.bdays.length + selEvents.coms.length + selEvents.ahs.length > 0;

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
      <div className="card">
        <div className="cal-header">
          <h3 style={{ margin: 0, textTransform: "capitalize" }}>
            {MONTH_NAMES_PT[view.m]} {view.y}
          </h3>
          <div className="cal-nav">
            <button className="btn secondary" onClick={prevMonth} aria-label="Mes anterior">←</button>
            <button className="btn secondary" onClick={goToday}>Hoje</button>
            <button className="btn secondary" onClick={nextMonth} aria-label="Proximo mes">→</button>
          </div>
        </div>

        <div className="cal-grid cal-weekhead">
          {WEEKDAYS_PT.map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
        </div>

        <div className="cal-grid">
          {Array.from({ length: totalCells }).map((_, idx) => {
            const day = idx - firstWeekday + 1;
            if (day < 1 || day > daysInMonth) return <div key={idx} className="cal-cell empty" />;
            const { bdays, coms, ahs } = eventsFor(day);
            const isToday =
              day === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();
            const isSel = day === sel.d && view.m === sel.m && view.y === sel.y;
            const feriado = coms.some((c) => c.kind === "feriado");
            return (
              <button
                key={idx}
                className={`cal-cell ${isToday ? "today" : ""} ${isSel ? "selected" : ""}`}
                onClick={() => setSel({ y: view.y, m: view.m, d: day })}
              >
                <span className={`cal-daynum ${feriado ? "feriado" : ""}`}>{day}</span>
                <span className="cal-dots">
                  {bdays.length > 0 && <span className="cal-dot aniversario" title="Aniversario" />}
                  {coms.length > 0 && (
                    <span className={`cal-dot ${feriado ? "feriado" : "comemorativa"}`} title="Data comemorativa" />
                  )}
                  {ahs.length > 0 && <span className="cal-dot allhands" title="All hands" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="cal-legend">
          <span className="legend-item"><i className="cal-dot aniversario" /> Aniversario</span>
          <span className="legend-item"><i className="cal-dot comemorativa" /> Comemorativa</span>
          <span className="legend-item"><i className="cal-dot feriado" /> Feriado</span>
          <span className="legend-item"><i className="cal-dot allhands" /> All hands</span>
        </div>
      </div>

      <div className="card">
        <div className="stat-label">Dia selecionado</div>
        <h3 style={{ margin: "2px 0 14px" }}>
          {sel.d} de {MONTH_NAMES_PT[sel.m].toLowerCase()}
        </h3>

        {!hasSelEvents ? (
          <p className="muted" style={{ margin: 0 }}>Nenhum evento neste dia.</p>
        ) : (
          <>
            {selEvents.coms.map((c, i) => (
              <div key={`c${i}`} className="cal-event">
                <span className={`cal-dot ${c.kind === "feriado" ? "feriado" : "comemorativa"}`} />
                <span>{c.name}</span>
                <span className={`pill ${c.kind === "feriado" ? "red" : "amber"}`}>
                  {c.kind === "feriado" ? "Feriado" : "Comemorativa"}
                </span>
              </div>
            ))}
            {selEvents.ahs.map((a) => (
              <div key={a.id} className="cal-event">
                <span className="cal-dot allhands" />
                <span>All Hands{a.title ? ` · ${a.title}` : ""}</span>
                <Link className="btn ghost" href="/all-hands">ver</Link>
              </div>
            ))}
            {selEvents.bdays.map((b) => (
              <div key={b.id} className="cal-event">
                <span className="cal-dot aniversario" />
                <Link href={`/colaboradores/${b.id}`}>{b.name}</Link>
                <span className="pill green">Aniversario</span>
              </div>
            ))}
          </>
        )}

        <div className="section-head" style={{ margin: "22px 0 10px" }}>
          <h3 style={{ fontSize: 14 }}>Comemorativas do mes</h3>
        </div>
        {comemorativas.filter((c) => c.month === month1).length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Nenhuma.</p>
        ) : (
          comemorativas
            .filter((c) => c.month === month1)
            .sort((a, b) => a.day - b.day)
            .map((c, i) => (
              <div key={`m${i}`} className="list-item" style={{ padding: "8px 0" }}>
                <span style={{ fontSize: 13 }}>
                  <span className={`cal-dot ${c.kind === "feriado" ? "feriado" : "comemorativa"}`} style={{ marginRight: 8 }} />
                  {c.name}
                </span>
                <span className="muted" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                  {String(c.day).padStart(2, "0")}/{String(c.month).padStart(2, "0")}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
