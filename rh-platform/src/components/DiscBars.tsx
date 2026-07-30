import { PROFILE_ARCHETYPES } from "@/lib/disc/score";
import type { DiscFactor, DiscScore } from "@/lib/disc/types";
import { DISC_FACTORS } from "@/lib/disc/types";

export function DiscBars({ scores }: { scores: DiscScore }) {
  return (
    <div className="disc-bars">
      {DISC_FACTORS.map((factor: DiscFactor) => {
        const meta = PROFILE_ARCHETYPES[factor];
        const value = scores[factor];
        return (
          <div className="disc-row" key={factor}>
            <div className="disc-factor-name">
              {factor} <small>{meta.label}</small>
            </div>
            <div className="disc-track">
              <div
                className="disc-fill"
                style={{ width: `${value}%`, background: meta.color }}
              />
            </div>
            <div className="disc-val">{value}</div>
          </div>
        );
      })}
    </div>
  );
}
