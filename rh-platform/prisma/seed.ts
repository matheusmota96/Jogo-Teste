import { PrismaClient } from "@prisma/client";
import { DISC_GROUPS } from "../src/lib/disc/questions";
import { scoreDisc } from "../src/lib/disc/score";
import type { DiscAnswer, DiscFactor } from "../src/lib/disc/types";

const prisma = new PrismaClient();

/** Gera respostas com vies para um fator dominante, para criar perfis variados. */
function biasedAnswers(dominant: DiscFactor, weakest: DiscFactor): DiscAnswer[] {
  return DISC_GROUPS.map((g, index) => {
    // A cada 4 grupos, varia levemente para o perfil nao ficar 100/0 cravado.
    const most: DiscFactor = index % 5 === 0 && dominant !== "I" ? "I" : dominant;
    const least: DiscFactor = index % 7 === 0 && weakest !== "S" ? "S" : weakest;
    return { groupId: g.id, most, least: least === most ? weakest : least };
  });
}

const people: Array<{
  name: string;
  email: string;
  role: string;
  department: string;
  dominant: DiscFactor;
  weakest: DiscFactor;
}> = [
  { name: "Ana Souza", email: "ana.souza@empresa.com", role: "Supervisora Comercial", department: "Comercial", dominant: "D", weakest: "S" },
  { name: "Bruno Lima", email: "bruno.lima@empresa.com", role: "Analista de Marketing", department: "Marketing", dominant: "I", weakest: "C" },
  { name: "Carla Nunes", email: "carla.nunes@empresa.com", role: "Analista de RH", department: "RH", dominant: "S", weakest: "D" },
  { name: "Diego Alves", email: "diego.alves@empresa.com", role: "Engenheiro de Dados", department: "Tecnologia", dominant: "C", weakest: "I" },
  { name: "Elaine Rocha", email: "elaine.rocha@empresa.com", role: "Coordenadora de Operacoes", department: "Operacoes", dominant: "D", weakest: "I" },
];

async function main() {
  console.log("Limpando dados anteriores...");
  await prisma.assessment.deleteMany();
  await prisma.collaborator.deleteMany();

  for (const p of people) {
    const answers = biasedAnswers(p.dominant, p.weakest);
    const result = scoreDisc(answers);

    await prisma.collaborator.create({
      data: {
        name: p.name,
        email: p.email,
        role: p.role,
        department: p.department,
        assessments: {
          create: {
            type: "DISC",
            scoreD: result.scores.D,
            scoreI: result.scores.I,
            scoreS: result.scores.S,
            scoreC: result.scores.C,
            primary: result.primary,
            secondary: result.secondary,
            profileName: result.profileName,
            answers: answers as unknown as object,
          },
        },
      },
    });
    console.log(`  + ${p.name} (${result.profileName} / primario ${result.primary})`);
  }

  console.log("Seed concluido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
