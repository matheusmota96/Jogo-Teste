/**
 * Verificacao do motor de scoring DISC (sem banco, sem framework).
 * Rode com: npm run test:disc
 */
import { DISC_GROUPS } from "./questions";
import { compatibility, scoreDisc } from "./score";
import type { DiscAnswer, DiscFactor } from "./types";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  [${status}] ${name}${detail ? ` -> ${detail}` : ""}`);
}

// Helper: responde todos os grupos com o mesmo "mais" e "menos".
function answerAll(most: DiscFactor, least: DiscFactor): DiscAnswer[] {
  return DISC_GROUPS.map((g) => ({ groupId: g.id, most, least }));
}

console.log("\nDISC scoring engine\n");

// 1. Perfil D puro: escolher sempre D como "mais" e S como "menos".
const dResult = scoreDisc(answerAll("D", "S"));
check("D=100 quando D e sempre o 'mais'", dResult.scores.D === 100, `D=${dResult.scores.D}`);
check("S=0 quando S e sempre o 'menos'", dResult.scores.S === 0, `S=${dResult.scores.S}`);
check("fator primario e D", dResult.primary === "D", dResult.primary);
check("arquetipo primario D = Executor", dResult.profileName === "Executor", dResult.profileName);

// 2. Fatores neutros (nem mais, nem menos) devem cair em 50.
check("I neutro = 50", dResult.scores.I === 50, `I=${dResult.scores.I}`);
check("C neutro = 50", dResult.scores.C === 50, `C=${dResult.scores.C}`);

// 3. Perfil I puro.
const iResult = scoreDisc(answerAll("I", "C"));
check("fator primario e I", iResult.primary === "I", iResult.primary);
check("arquetipo primario I = Comunicador", iResult.profileName === "Comunicador", iResult.profileName);

// 4. Todos os scores dentro de 0-100.
const allBounded = Object.values(iResult.scores).every((v) => v >= 0 && v <= 100);
check("scores sempre entre 0 e 100", allBounded, JSON.stringify(iResult.scores));

// 5. Sem respostas -> tudo 50 (baseline neutro, sem divisao por zero).
const empty = scoreDisc([]);
check(
  "sem respostas retorna baseline 50/50/50/50",
  empty.scores.D === 50 && empty.scores.I === 50 && empty.scores.S === 50 && empty.scores.C === 50,
  JSON.stringify(empty.scores)
);

// 6. Compatibilidade: perfis identicos = 100.
check(
  "compatibilidade de perfis identicos = 100",
  compatibility(dResult.scores, dResult.scores) === 100
);

// 7. Compatibilidade: opostos extremos = 0.
const pureD = scoreDisc(answerAll("D", "C")).scores; // D=100, C=0
const pureC = scoreDisc(answerAll("C", "D")).scores; // C=100, D=0
check(
  "compatibilidade D-puro x C-puro e baixa",
  compatibility(pureD, pureC) <= 50,
  `${compatibility(pureD, pureC)}%`
);

// 8. Integridade do questionario: 4 palavras distintas por grupo, ids unicos.
const idsUnicos = new Set(DISC_GROUPS.map((g) => g.id)).size === DISC_GROUPS.length;
check("ids de grupo unicos", idsUnicos);
const palavrasOk = DISC_GROUPS.every(
  (g) => new Set(Object.values(g.words)).size === 4
);
check("cada grupo tem 4 palavras distintas", palavrasOk);

console.log(`\n${failures === 0 ? "OK - todos os testes passaram" : `FALHOU - ${failures} teste(s)`}\n`);
process.exit(failures === 0 ? 0 : 1);
