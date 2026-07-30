import { PrismaClient } from "@prisma/client";
import { DISC_GROUPS } from "../src/lib/disc/questions";
import { scoreDisc } from "../src/lib/disc/score";
import type { DiscAnswer, DiscFactor } from "../src/lib/disc/types";

const prisma = new PrismaClient();

function biasedAnswers(dominant: DiscFactor, weakest: DiscFactor): DiscAnswer[] {
  return DISC_GROUPS.map((g, index) => {
    const most: DiscFactor = index % 5 === 0 && dominant !== "I" ? "I" : dominant;
    let least: DiscFactor = index % 7 === 0 && weakest !== "S" ? "S" : weakest;
    if (least === most) least = weakest;
    return { groupId: g.id, most, least };
  });
}

async function clear() {
  console.log("Limpando dados...");
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.keyResult.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.recognition.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.pdiAction.deleteMany();
  await prisma.pdi.deleteMany();
  await prisma.competencyRating.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.onboardingTask.deleteMany();
  await prisma.onboardingPlan.deleteMany();
  await prisma.employmentEvent.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.positionCompetency.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.position.deleteMany();
}

async function main() {
  await clear();

  // ---- Modulo 2: Cargos (com hierarquia + perfil ideal + competencias) ----
  console.log("Criando cargos...");
  const ceo = await prisma.position.create({
    data: {
      title: "CEO",
      department: "Diretoria",
      seniority: "DIRETOR",
      idealD: 90,
      idealI: 70,
      idealS: 40,
      idealC: 60,
      mission: "Definir a estrategia e garantir os resultados da empresa.",
    },
  });

  const dirComercial = await prisma.position.create({
    data: {
      title: "Diretor Comercial",
      department: "Comercial",
      seniority: "DIRETOR",
      parentId: ceo.id,
      idealD: 85,
      idealI: 80,
      idealS: 35,
      idealC: 55,
      mission: "Liderar a operacao comercial e o crescimento de receita.",
    },
  });

  const supComercial = await prisma.position.create({
    data: {
      title: "Supervisor Comercial",
      department: "Comercial",
      seniority: "COORDENADOR",
      parentId: dirComercial.id,
      salaryMin: 6000,
      salaryMax: 9000,
      workSchedule: "44h semanais",
      idealD: 90,
      idealI: 70,
      idealS: 50,
      idealC: 80,
      mission: "Conduzir a equipe de vendas ao atingimento das metas.",
      responsibilities: "Gerir o time de vendas\nAcompanhar KPIs\nDesenvolver vendedores",
      deliverables: "Meta mensal batida\nPipeline saudavel",
      requirements: "Experiencia em gestao comercial\nEnsino superior",
      benefits: "VR\nPlano de saude\nComissao",
      competencies: {
        create: [
          { name: "Comunicacao", weight: 10, kind: "COMPORTAMENTAL" },
          { name: "Lideranca", weight: 9, kind: "COMPORTAMENTAL" },
          { name: "Negociacao", weight: 10, kind: "TECNICA" },
          { name: "Organizacao", weight: 8, kind: "COMPORTAMENTAL" },
        ],
      },
    },
  });

  const gerTech = await prisma.position.create({
    data: {
      title: "Gerente de Tecnologia",
      department: "Tecnologia",
      seniority: "GERENTE",
      parentId: ceo.id,
      idealD: 70,
      idealI: 55,
      idealS: 55,
      idealC: 85,
    },
  });

  const engDados = await prisma.position.create({
    data: {
      title: "Engenheiro de Dados",
      department: "Tecnologia",
      seniority: "ANALISTA_SR",
      parentId: gerTech.id,
      salaryMin: 9000,
      salaryMax: 14000,
      idealD: 45,
      idealI: 40,
      idealS: 55,
      idealC: 95,
      competencies: {
        create: [
          { name: "SQL", weight: 10, kind: "TECNICA" },
          { name: "Atencao a detalhes", weight: 9, kind: "COMPORTAMENTAL" },
        ],
      },
    },
  });

  const coordRh = await prisma.position.create({
    data: {
      title: "Coordenador de RH",
      department: "RH",
      seniority: "COORDENADOR",
      parentId: ceo.id,
      idealD: 60,
      idealI: 75,
      idealS: 75,
      idealC: 65,
    },
  });

  const analistaRh = await prisma.position.create({
    data: {
      title: "Analista de RH",
      department: "RH",
      seniority: "ANALISTA_PL",
      parentId: coordRh.id,
      salaryMin: 4000,
      salaryMax: 6500,
      idealD: 40,
      idealI: 70,
      idealS: 85,
      idealC: 70,
    },
  });

  const analistaMkt = await prisma.position.create({
    data: {
      title: "Analista de Marketing",
      department: "Marketing",
      seniority: "ANALISTA_PL",
      parentId: dirComercial.id,
      idealD: 45,
      idealI: 90,
      idealS: 50,
      idealC: 55,
    },
  });

  // ---- Modulo 1 + 5: Colaboradores com DNA, cargo, gestor ----
  console.log("Criando colaboradores...");
  const people: Array<{
    name: string;
    email: string;
    positionId: string;
    department: string;
    dominant: DiscFactor;
    weakest: DiscFactor;
    salary: number;
    overall: number;
    potential: number;
  }> = [
    { name: "Ana Souza", email: "ana.souza@empresa.com", positionId: supComercial.id, department: "Comercial", dominant: "D", weakest: "S", salary: 8000, overall: 4.5, potential: 4.5 },
    { name: "Bruno Lima", email: "bruno.lima@empresa.com", positionId: analistaMkt.id, department: "Marketing", dominant: "I", weakest: "C", salary: 5500, overall: 3.2, potential: 4.0 },
    { name: "Carla Nunes", email: "carla.nunes@empresa.com", positionId: analistaRh.id, department: "RH", dominant: "S", weakest: "D", salary: 5200, overall: 4.0, potential: 3.0 },
    { name: "Diego Alves", email: "diego.alves@empresa.com", positionId: engDados.id, department: "Tecnologia", dominant: "C", weakest: "I", salary: 12000, overall: 4.8, potential: 4.2 },
    { name: "Elaine Rocha", email: "elaine.rocha@empresa.com", positionId: coordRh.id, department: "RH", dominant: "D", weakest: "I", salary: 11000, overall: 2.0, potential: 2.5 },
  ];

  const managerByDept: Record<string, string> = {};
  const created: Record<string, { id: string; overall: number; potential: number }> = {};

  for (const p of people) {
    const answers = biasedAnswers(p.dominant, p.weakest);
    const result = scoreDisc(answers);
    const c = await prisma.collaborator.create({
      data: {
        name: p.name,
        email: p.email,
        department: p.department,
        positionId: p.positionId,
        status: "ACTIVE",
        salary: p.salary,
        admissionDate: new Date("2024-03-01"),
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
        events: {
          create: [
            { type: "ADMISSAO", description: "Admissao na empresa", date: new Date("2024-03-01") },
          ],
        },
      },
    });
    created[p.name] = { id: c.id, overall: p.overall, potential: p.potential };
    if (p.name === "Elaine Rocha") managerByDept["RH"] = c.id;
    if (p.name === "Ana Souza") managerByDept["Comercial"] = c.id;
    console.log(`  + ${p.name} (${result.profileName})`);
  }

  // Gestores: Carla reporta a Elaine (RH); Bruno reporta a Ana (Comercial).
  await prisma.collaborator.update({
    where: { id: created["Carla Nunes"].id },
    data: { managerId: managerByDept["RH"] },
  });
  await prisma.collaborator.update({
    where: { id: created["Bruno Lima"].id },
    data: { managerId: managerByDept["Comercial"] },
  });

  // Evento de promocao para Ana.
  await prisma.employmentEvent.create({
    data: {
      collaboratorId: created["Ana Souza"].id,
      type: "PROMOCAO",
      description: "Promovida a Supervisora Comercial",
      salaryValue: 8000,
      date: new Date("2025-01-15"),
    },
  });

  // ---- Modulo 6: Performance + PDI ----
  console.log("Criando avaliacoes e PDIs...");
  for (const name of Object.keys(created)) {
    const c = created[name];
    await prisma.performanceReview.create({
      data: {
        collaboratorId: c.id,
        type: "THREE_SIXTY",
        cycle: "2026-S1",
        status: "COMPLETED",
        overallScore: c.overall,
        potentialScore: c.potential,
        notes: "Avaliacao do ciclo 2026-S1.",
        ratings: {
          create: [
            { competencyName: "Comunicacao", score: Math.min(5, c.overall) },
            { competencyName: "Execucao", score: Math.min(5, c.overall + 0.3) },
            { competencyName: "Colaboracao", score: Math.max(1, c.overall - 0.3) },
          ],
        },
      },
    });
  }

  await prisma.pdi.create({
    data: {
      collaboratorId: created["Elaine Rocha"].id,
      objective: "Desenvolver competencias de lideranca e escuta ativa",
      status: "IN_PROGRESS",
      actions: {
        create: [
          { title: "Treinamento de lideranca", done: true },
          { title: "Mentoria mensal com diretoria", done: false },
          { title: "Feedback 360 trimestral", done: false },
        ],
      },
    },
  });

  // ---- Modulo 3: ATS (vaga + candidatos no pipeline) ----
  console.log("Criando vaga e candidatos...");
  const job = await prisma.job.create({
    data: {
      positionId: engDados.id,
      title: "Engenheiro de Dados",
      location: "Remoto",
      status: "OPEN",
    },
  });

  const candidates: Array<{ name: string; email: string; stage: string; score: number; disc: string }> = [
    { name: "Felipe Castro", email: "felipe@ex.com", stage: "INSCRITO", score: 62, disc: "C" },
    { name: "Gabriela Dias", email: "gabriela@ex.com", stage: "TRIAGEM", score: 78, disc: "C" },
    { name: "Hugo Martins", email: "hugo@ex.com", stage: "ENTREVISTA_RH", score: 84, disc: "S" },
    { name: "Isabela Reis", email: "isabela@ex.com", stage: "ENTREVISTA_GESTOR", score: 91, disc: "C" },
    { name: "Joao Pedro", email: "joaopedro@ex.com", stage: "OFERTA", score: 88, disc: "D" },
  ];
  for (const cand of candidates) {
    const candidate = await prisma.candidate.create({
      data: { name: cand.name, email: cand.email },
    });
    await prisma.application.create({
      data: {
        jobId: job.id,
        candidateId: candidate.id,
        stage: cand.stage as never,
        score: cand.score,
        discPrimary: cand.disc,
      },
    });
  }

  // ---- Modulo 4: Onboarding (para um contratado recente) ----
  console.log("Criando onboarding...");
  await prisma.onboardingPlan.create({
    data: {
      collaboratorId: created["Bruno Lima"].id,
      status: "IN_PROGRESS",
      tasks: {
        create: [
          { title: "Entregar documentos admissionais", category: "DOCUMENTO", dueDay: 1, done: true },
          { title: "Assinar contrato", category: "ASSINATURA", dueDay: 1, done: true },
          { title: "Receber notebook e acessos", category: "EQUIPAMENTO", dueDay: 2, done: true },
          { title: "Integracao de cultura", category: "INTEGRACAO", dueDay: 5, done: false },
          { title: "Treinamento inicial da area", category: "TREINAMENTO", dueDay: 15, done: false },
          { title: "Definir metas dos primeiros 90 dias", category: "META", dueDay: 30, done: false },
        ],
      },
    },
  });

  // ---- Modulo 7: Engajamento (eNPS + clima + reconhecimento) ----
  console.log("Criando pesquisas e reconhecimentos...");
  const enps = await prisma.survey.create({
    data: { title: "eNPS Trimestral", type: "ENPS", status: "OPEN", question: "Voce recomendaria a empresa?" },
  });
  const enpsScores = [10, 9, 9, 8, 7, 6, 10, 9, 5, 8];
  for (const s of enpsScores) {
    await prisma.surveyResponse.create({ data: { surveyId: enps.id, score: s } });
  }
  await prisma.survey.create({
    data: { title: "Pesquisa de Clima 2026", type: "CLIMA", status: "OPEN", question: "Como voce avalia o ambiente?" },
  });

  await prisma.recognition.create({
    data: {
      fromCollaboratorId: created["Elaine Rocha"].id,
      toCollaboratorId: created["Carla Nunes"].id,
      message: "Excelente conducao do processo seletivo!",
      badge: "Colaboracao",
    },
  });

  // ---- Diferencial: OKRs ----
  console.log("Criando OKRs...");
  await prisma.objective.create({
    data: {
      title: "Crescer receita em 30%",
      level: "COMPANY",
      cycle: "2026-Q3",
      keyResults: {
        create: [
          { title: "Fechar 50 novos contratos", progress: 60 },
          { title: "Reduzir churn para 3%", progress: 40 },
        ],
      },
    },
  });
  await prisma.objective.create({
    data: {
      title: "Estruturar area de dados",
      level: "AREA",
      area: "Tecnologia",
      ownerId: created["Diego Alves"].id,
      cycle: "2026-Q3",
      keyResults: {
        create: [
          { title: "Implantar data warehouse", progress: 80 },
          { title: "Criar 10 dashboards executivos", progress: 50 },
        ],
      },
    },
  });

  // ---- Diferencial: LMS ----
  console.log("Criando cursos...");
  const curso = await prisma.course.create({
    data: { title: "Lideranca na Pratica", category: "Lideranca", hours: 12, description: "Fundamentos de gestao de pessoas." },
  });
  await prisma.enrollment.create({
    data: { courseId: curso.id, collaboratorId: created["Elaine Rocha"].id, progress: 100, completedAt: new Date("2026-05-10") },
  });
  await prisma.enrollment.create({
    data: { courseId: curso.id, collaboratorId: created["Ana Souza"].id, progress: 45 },
  });
  await prisma.course.create({
    data: { title: "SQL para Analise de Dados", category: "Tecnologia", hours: 20 },
  });

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
