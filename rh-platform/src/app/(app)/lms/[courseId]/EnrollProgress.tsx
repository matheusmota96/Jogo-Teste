"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EnrollmentInput = { id: string; progress: number };

export function EnrollProgress({ enrollment }: { enrollment: EnrollmentInput }) {
  const router = useRouter();
  const [progress, setProgress] = useState(enrollment.progress);
  const [saving, setSaving] = useState(false);

  async function save(next: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(next)));
    setProgress(clamped);
    setSaving(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollment.id}`, {
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
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
    </div>
  );
}
