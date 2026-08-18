"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FilterOptions, Period } from "@/lib/dashboard";
import { PERIOD_LABELS } from "@/lib/dashboard";

const PERIODS: Period[] = ["mes", "3m", "6m", "12m", "ano"];

export function DashboardFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  const period = params.get("period") ?? "mes";

  return (
    <div className="filters-bar">
      <div className="filter">
        <label>Período</label>
        <select value={period} onChange={(e) => setParam("period", e.target.value)}>
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="filter">
        <label>Empresa</label>
        <select value={params.get("company") ?? ""} onChange={(e) => setParam("company", e.target.value)}>
          <option value="">Todas</option>
          {options.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="filter">
        <label>Departamento</label>
        <select value={params.get("dept") ?? ""} onChange={(e) => setParam("dept", e.target.value)}>
          <option value="">Todos</option>
          {options.departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="filter">
        <label>Gestor</label>
        <select value={params.get("manager") ?? ""} onChange={(e) => setParam("manager", e.target.value)}>
          <option value="">Todos</option>
          {options.managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
