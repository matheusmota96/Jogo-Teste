import type { DiscFactor } from "./types";

/**
 * Questionario DISC de escolha forcada.
 * Cada grupo traz 4 adjetivos, um por fator (D, I, S, C). O respondente
 * escolhe qual e MAIS e qual e MENOS parecido com ele. Esse formato reduz
 * vies de aquiescencia e e o padrao classico de instrumentos DISC.
 */
export interface DiscGroup {
  id: number;
  words: Record<DiscFactor, string>;
}

export const DISC_GROUPS: DiscGroup[] = [
  { id: 1, words: { D: "Decidido", I: "Persuasivo", S: "Paciente", C: "Preciso" } },
  { id: 2, words: { D: "Competitivo", I: "Sociavel", S: "Calmo", C: "Cauteloso" } },
  { id: 3, words: { D: "Direto", I: "Entusiasmado", S: "Leal", C: "Analitico" } },
  { id: 4, words: { D: "Ousado", I: "Comunicativo", S: "Constante", C: "Organizado" } },
  { id: 5, words: { D: "Determinado", I: "Otimista", S: "Cooperativo", C: "Detalhista" } },
  { id: 6, words: { D: "Assertivo", I: "Expressivo", S: "Estavel", C: "Metodico" } },
  { id: 7, words: { D: "Exigente", I: "Inspirador", S: "Amavel", C: "Perfeccionista" } },
  { id: 8, words: { D: "Focado em resultados", I: "Popular", S: "Prestativo", C: "Sistematico" } },
  { id: 9, words: { D: "Independente", I: "Carismatico", S: "Tranquilo", C: "Disciplinado" } },
  { id: 10, words: { D: "Corajoso", I: "Extrovertido", S: "Compreensivo", C: "Rigoroso" } },
  { id: 11, words: { D: "Energico", I: "Convincente", S: "Ponderado", C: "Criterioso" } },
  { id: 12, words: { D: "Impaciente", I: "Espontaneo", S: "Acolhedor", C: "Conservador" } },
  { id: 13, words: { D: "Firme", I: "Animado", S: "Diplomatico", C: "Formal" } },
  { id: 14, words: { D: "Objetivo", I: "Falante", S: "Gentil", C: "Exato" } },
  { id: 15, words: { D: "Autoconfiante", I: "Empolgado", S: "Sereno", C: "Reservado" } },
  { id: 16, words: { D: "Pioneiro", I: "Alegre", S: "Consistente", C: "Logico" } },
  { id: 17, words: { D: "Combativo", I: "Simpatico", S: "Harmonioso", C: "Cuidadoso" } },
  { id: 18, words: { D: "Dominante", I: "Influente", S: "Solidario", C: "Estruturado" } },
  { id: 19, words: { D: "Agil", I: "Aberto", S: "Previsivel", C: "Minucioso" } },
  { id: 20, words: { D: "Realizador", I: "Motivador", S: "Equilibrado", C: "Meticuloso" } },
];

export const DISC_GROUP_COUNT = DISC_GROUPS.length;
