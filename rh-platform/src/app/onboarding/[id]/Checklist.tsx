"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OnboardingCategory } from "@prisma/client";
import { CATEGORY_LABELS, CATEGORY_PILL_COLORS } from "@/lib/onboarding";

export type ChecklistTask = {
  id: string;
  title: string;
  category: OnboardingCategory;
  dueDay: number;
  done: boolean;
};

const CATEGORY_ORDER: OnboardingCategory[] = [
  "DOCUMENTO",
  "ASSINATURA",
  "EQUIPAMENTO",
  "INTEGRACAO",
  "TREINAMENTO",
  "META",
];

export function Checklist({ tasks }: { tasks: ChecklistTask[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistTask[]>(tasks);
  const [savingId, setSavingId] = useState<string | null>(null);

  const done = items.filter((t) => t.done).length;
  const total = items.length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  const groups = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      tasks: items
        .filter((t) => t.category === category)
        .sort((a, b) => a.dueDay - b.dueDay),
    })).filter((g) => g.tasks.length > 0);
  }, [items]);

  async function toggle(task: ChecklistTask) {
    const nextDone = !task.done;
    setSavingId(task.id);
    // Atualizacao otimista para progresso ao vivo.
    setItems((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: nextDone } : t))
    );
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar tarefa.");
      router.refresh();
    } catch {
      // Reverte em caso de falha.
      setItems((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t))
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <strong>Progresso do plano</strong>
          <span className="muted" style={{ fontSize: 13 }}>
            {done}/{total} tarefas · {progress}%
          </span>
        </div>
        <div className="meter">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>

      {groups.map((g) => (
        <div className="card" key={g.category} style={{ marginBottom: 16 }}>
          <div className="section-head">
            <h3>{CATEGORY_LABELS[g.category]}</h3>
            <span className={`pill ${CATEGORY_PILL_COLORS[g.category]}`}>
              {g.tasks.filter((t) => t.done).length}/{g.tasks.length}
            </span>
          </div>
          {g.tasks.map((t) => (
            <label
              key={t.id}
              className={`check-item${t.done ? " done" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={t.done}
                disabled={savingId === t.id}
                onChange={() => toggle(t)}
              />
              <span style={{ flex: 1 }}>{t.title}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                Dia {t.dueDay}
              </span>
            </label>
          ))}
        </div>
      ))}
    </>
  );
}
