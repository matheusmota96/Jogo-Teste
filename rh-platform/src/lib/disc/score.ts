import type { DiscAnswer, DiscFactor, DiscResult, DiscScore } from "./types";
import { DISC_FACTORS } from "./types";

export const PROFILE_ARCHETYPES: Record<
  DiscFactor,
  { name: string; label: string; color: string; description: string }
> = {
  D: {
    name: "Executor",
    label: "Dominancia",
    color: "#e5484d",
    description:
      "Foco em resultados, decisoes rapidas e postura desafiadora. Gosta de assumir o controle, aceita riscos e e movido por metas.",
  },
  I: {
    name: "Comunicador",
    label: "Influencia",
    color: "#f5a623",
    description:
      "Foco em pessoas e relacionamentos. Comunicativo, otimista e persuasivo, influencia pelo entusiasmo e cria conexoes com facilidade.",
  },
  S: {
    name: "Planejador",
    label: "Estabilidade",
    color: "#30a46c",
    description:
      "Foco em estabilidade e cooperacao. Paciente, leal e consistente, valoriza harmonia, rotina e trabalho em equipe.",
  },
  C: {
    name: "Analista",
    label: "Conformidade",
    color: "#3b82f6",
    description:
      "Foco em qualidade e precisao. Detalhista, analitico e organizado, preza por regras, dados e execucao impecavel.",
  },
};

/**
 * Calcula o perfil DISC a partir das respostas de escolha forcada.
 *
 * Cada "mais" soma +1 ao fator; cada "menos" subtrai 1. O bruto por fator
 * varia em [-n, +n]; normalizamos para 0-100 com (bruto + n) / (2n).
 * Empates no ranking sao resolvidos pela ordem canonica D > I > S > C.
 */
export function scoreDisc(answers: DiscAnswer[]): DiscResult {
  const raw: Record<DiscFactor, number> = { D: 0, I: 0, S: 0, C: 0 };

  for (const answer of answers) {
    raw[answer.most] += 1;
    raw[answer.least] -= 1;
  }

  const n = answers.length || 1;
  const normalize = (value: number) => Math.round(((value + n) / (2 * n)) * 100);

  const scores: DiscScore = {
    D: normalize(raw.D),
    I: normalize(raw.I),
    S: normalize(raw.S),
    C: normalize(raw.C),
  };

  const ranked = [...DISC_FACTORS].sort((a, b) => scores[b] - scores[a]);
  const primary = ranked[0];
  const secondary = ranked[1];

  return {
    scores,
    primary,
    secondary,
    profileName: PROFILE_ARCHETYPES[primary].name,
    profileDescription: PROFILE_ARCHETYPES[primary].description,
  };
}

/**
 * Compatibilidade comportamental entre dois perfis (0-100).
 * Base para "compatibilidade entre colaboradores" e "colaborador x cargo".
 * 100 = perfis identicos; cai conforme a distancia media entre os fatores.
 */
export function compatibility(a: DiscScore, b: DiscScore): number {
  const distance =
    (Math.abs(a.D - b.D) +
      Math.abs(a.I - b.I) +
      Math.abs(a.S - b.S) +
      Math.abs(a.C - b.C)) /
    4;
  return Math.round(100 - distance);
}
