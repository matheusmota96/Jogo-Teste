"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Kr = { id: string; title: string; progress: number };

export function KrProgress({ kr }: { kr: Kr }) {
  const router = useRouter();
  const [progress, setProgress] = useState(kr.progress);
  const [saving, setSaving] = useState(false);

  async function save(next: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(next)));
    setProgress(clamped);
    setSaving(true);
    try {
      const res = await fetch(`/api/key-results/${kr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: clamped }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{kr.title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            className="btn ghost"
            type="button"
            onClick={() => save(progress - 10)}
            disabled={saving || progress <= 0}
            style={{ padding: "2px 8px" }}
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            onBlur={() => save(progress)}
            style={{ width: 64, padding: "4px 6px" }}
          />
          <button
            className="btn ghost"
            type="button"
            onClick={() => save(progress + 10)}
            disabled={saving || progress >= 100}
            style={{ padding: "2px 8px" }}
          >
            +
          </button>
          <span className="muted" style={{ fontSize: 13, width: 34, textAlign: "right" }}>
            {progress}%
          </span>
        </div>
      </div>
      <div className="meter">
        <div style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
