"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = { id: string; title: string; done: boolean };

export function PdiActions({ actions }: { actions: Action[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(action: Action) {
    setPending(action.id);
    try {
      const res = await fetch(`/api/pdi-actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !action.done }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (actions.length === 0) {
    return <p className="muted" style={{ fontSize: 13, margin: 0 }}>Nenhuma ação cadastrada.</p>;
  }

  return (
    <div>
      {actions.map((a) => (
        <label
          key={a.id}
          className={`check-item${a.done ? " done" : ""}`}
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={a.done}
            disabled={pending === a.id}
            onChange={() => toggle(a)}
          />
          <span>{a.title}</span>
        </label>
      ))}
    </div>
  );
}
