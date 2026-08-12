"use client";

import Link from "next/link";
import { useState } from "react";

type Person = { id: string; name: string; department: string | null; date: Date | string | null };

export function PeopleReveal({
  label,
  people,
}: {
  label: string;
  people: Person[];
}) {
  const [open, setOpen] = useState(false);
  if (people.length === 0) {
    return <span className="muted" style={{ fontSize: 12 }}>Sem registros no periodo</span>;
  }
  return (
    <div>
      <button className="btn ghost" style={{ paddingLeft: 0 }} onClick={() => setOpen(!open)}>
        {open ? "Ocultar" : `Ver ${label.toLowerCase()}`}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {people.map((p) => (
            <div key={p.id} className="list-item">
              <Link href={`/colaboradores/${p.id}`}>{p.name}</Link>
              <span className="muted" style={{ fontSize: 12 }}>
                {p.department ?? "-"} ·{" "}
                {p.date ? new Date(p.date).toLocaleDateString("pt-BR") : "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
