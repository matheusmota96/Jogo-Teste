// Datas comemorativas brasileiras (feriados nacionais + comemorativas),
// calculadas por ano. Modulo puro (sem prisma) — pode ser usado no cliente.

export type Comemorativa = {
  month: number; // 1-12
  day: number;
  name: string;
  kind: "feriado" | "comemorativa";
};

/** Domingo de Pascoa (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
function easter(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=marco, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function shift(year: number, month1: number, day: number, delta: number): { month: number; day: number } {
  const d = new Date(Date.UTC(year, month1 - 1, day + delta));
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** N-esimo dia da semana do mes (weekday: 0=domingo). */
function nthWeekday(year: number, month0: number, weekday: number, n: number): number {
  const first = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

/** Ultimo dia da semana do mes. */
function lastWeekday(year: number, month0: number, weekday: number): number {
  const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month0, lastDay)).getUTCDay();
  return lastDay - ((lastDow - weekday + 7) % 7);
}

export function getComemorativas(year: number): Comemorativa[] {
  const e = easter(year);
  const carnaval = shift(year, e.month, e.day, -47);
  const sextaSanta = shift(year, e.month, e.day, -2);
  const corpus = shift(year, e.month, e.day, 60);

  const list: Comemorativa[] = [
    // Feriados nacionais fixos
    { month: 1, day: 1, name: "Confraternizacao Universal", kind: "feriado" },
    { month: 4, day: 21, name: "Tiradentes", kind: "feriado" },
    { month: 5, day: 1, name: "Dia do Trabalho", kind: "feriado" },
    { month: 9, day: 7, name: "Independencia do Brasil", kind: "feriado" },
    { month: 10, day: 12, name: "Nossa Senhora Aparecida", kind: "feriado" },
    { month: 11, day: 2, name: "Finados", kind: "feriado" },
    { month: 11, day: 15, name: "Proclamacao da Republica", kind: "feriado" },
    { month: 11, day: 20, name: "Consciencia Negra", kind: "feriado" },
    { month: 12, day: 25, name: "Natal", kind: "feriado" },

    // Feriados moveis
    { month: carnaval.month, day: carnaval.day, name: "Carnaval", kind: "feriado" },
    { month: sextaSanta.month, day: sextaSanta.day, name: "Sexta-feira Santa", kind: "feriado" },
    { month: e.month, day: e.day, name: "Pascoa", kind: "comemorativa" },
    { month: corpus.month, day: corpus.day, name: "Corpus Christi", kind: "feriado" },

    // Datas comemorativas
    { month: 3, day: 8, name: "Dia Internacional da Mulher", kind: "comemorativa" },
    { month: 5, day: nthWeekday(year, 4, 0, 2), name: "Dia das Maes", kind: "comemorativa" },
    { month: 6, day: 12, name: "Dia dos Namorados", kind: "comemorativa" },
    { month: 8, day: nthWeekday(year, 7, 0, 2), name: "Dia dos Pais", kind: "comemorativa" },
    { month: 9, day: 15, name: "Dia do Cliente", kind: "comemorativa" },
    { month: 10, day: 12, name: "Dia das Criancas", kind: "comemorativa" },
    { month: 11, day: lastWeekday(year, 10, 5), name: "Black Friday", kind: "comemorativa" },
    { month: 12, day: 31, name: "Vespera de Ano Novo", kind: "comemorativa" },
  ];

  return list;
}

export const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
