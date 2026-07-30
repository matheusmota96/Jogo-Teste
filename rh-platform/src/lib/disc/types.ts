export type DiscFactor = "D" | "I" | "S" | "C";

export const DISC_FACTORS: DiscFactor[] = ["D", "I", "S", "C"];

/** Resposta de um grupo: palavra "mais" e "menos" parecida com o respondente. */
export interface DiscAnswer {
  groupId: number;
  most: DiscFactor;
  least: DiscFactor;
}

/** Pontuacao normalizada 0-100 por fator. */
export interface DiscScore {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DiscResult {
  scores: DiscScore;
  primary: DiscFactor;
  secondary: DiscFactor;
  profileName: string;
  profileDescription: string;
}
