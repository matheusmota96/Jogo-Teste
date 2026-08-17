"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!confirm("Remover esta reuniao?")) return;
    setLoading(true);
    try {
      await fetch(`/api/all-hands/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn ghost" onClick={remove} disabled={loading} title="Remover">
      {loading ? "…" : "Remover"}
    </button>
  );
}
