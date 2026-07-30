"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DiscBadge } from "@/components/DiscBadge";
import { DiscBars } from "@/components/DiscBars";
import type { DiscGroup } from "@/lib/disc/questions";
import type { DiscAnswer, DiscFactor, DiscResult } from "@/lib/disc/types";
import { DISC_FACTORS } from "@/lib/disc/types";

type PartialAnswer = { most?: DiscFactor; least?: DiscFactor };

export function ProfilerTest({
  collaboratorId,
  collaboratorName,
  groups,
}: {
  collaboratorId: string;
  collaboratorName: string;
  groups: DiscGroup[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, PartialAnswer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiscResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const group = groups[step];
  const current = answers[group.id] ?? {};
  const total = groups.length;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a.most && a.least).length,
    [answers]
  );
  const allAnswered = answeredCount === total;

  function pick(kind: "most" | "least", factor: DiscFactor) {
    setAnswers((prev) => {
      const entry: PartialAnswer = { ...(prev[group.id] ?? {}) };
      // Nao permitir a mesma palavra como "mais" e "menos".
      if (kind === "most") {
        entry.most = factor;
        if (entry.least === factor) entry.least = undefined;
      } else {
        entry.least = factor;
        if (entry.most === factor) entry.most = undefined;
      }
      return { ...prev, [group.id]: entry };
    });
  }

  const canAdvance = Boolean(current.most && current.least);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const payload: DiscAnswer[] = groups.map((g) => ({
      groupId: g.id,
      most: answers[g.id]!.most!,
      least: answers[g.id]!.least!,
    }));
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaboratorId, answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao registrar.");
      setResult(data.result as DiscResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Tela de resultado ----
  if (result) {
    return (
      <>
        <h1 className="page-title">Resultado do Profiler</h1>
        <p className="page-subtitle">{collaboratorName}</p>
        <div className="grid cols-2">
          <div className="card">
            <div className="row-between" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>DNA Comportamental</h3>
              <DiscBadge primary={result.primary} label={result.profileName} />
            </div>
            <DiscBars scores={result.scores} />
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{result.profileName}</h3>
            <p style={{ fontSize: 14 }}>{result.profileDescription}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Link className="btn" href={`/colaboradores/${collaboratorId}`}>
            Ver perfil completo
          </Link>
          <Link className="btn secondary" href="/profiler">
            Aplicar em outro colaborador
          </Link>
        </div>
      </>
    );
  }

  // ---- Questionario ----
  return (
    <>
      <h1 className="page-title">Profiler DISC</h1>
      <p className="page-subtitle">
        {collaboratorName} · grupo {step + 1} de {total}
      </p>

      <div className="progress">
        <div style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <div className="card">
        <p style={{ marginTop: 0, fontWeight: 600 }}>
          Marque a palavra que <span style={{ color: "var(--s)" }}>MAIS</span> e a que{" "}
          <span style={{ color: "var(--d)" }}>MENOS</span> combina com voce:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DISC_FACTORS.map((factor) => {
            const word = group.words[factor];
            return (
              <div className="choice-grid" key={factor}>
                <div className="choice-word">{word}</div>
                <button
                  className={`pick-btn most ${current.most === factor ? "on" : ""}`}
                  onClick={() => pick("most", factor)}
                  type="button"
                >
                  Mais
                </button>
                <button
                  className={`pick-btn least ${current.least === factor ? "on" : ""}`}
                  onClick={() => pick("least", factor)}
                  type="button"
                >
                  Menos
                </button>
              </div>
            );
          })}
        </div>

        {error && <p style={{ color: "var(--d)", fontSize: 13 }}>{error}</p>}

        <div className="row-between" style={{ marginTop: 20 }}>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← Voltar
          </button>

          {step < total - 1 ? (
            <button
              className="btn"
              type="button"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              disabled={!canAdvance}
            >
              Proximo →
            </button>
          ) : (
            <button
              className="btn"
              type="button"
              onClick={submit}
              disabled={!allAnswered || submitting}
            >
              {submitting ? "Calculando..." : "Finalizar e calcular perfil"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
