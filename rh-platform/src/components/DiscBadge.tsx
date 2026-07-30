import { PROFILE_ARCHETYPES } from "@/lib/disc/score";
import type { DiscFactor } from "@/lib/disc/types";

export function DiscBadge({ primary, label }: { primary: string; label?: string }) {
  const factor = primary as DiscFactor;
  const meta = PROFILE_ARCHETYPES[factor];
  if (!meta) return null;
  return (
    <span className="badge" style={{ background: meta.color }}>
      {primary} · {label ?? meta.name}
    </span>
  );
}
