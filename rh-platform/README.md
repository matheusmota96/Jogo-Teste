# Plataforma de RH (HRIS)

Plataforma completa de gestão de pessoas orientada a dados — do mapeamento
comportamental ao People Analytics. O núcleo transversal é o **DNA
Comportamental** (Profiler DISC), consumido pelos demais módulos.

Stack: **Next.js 15 (App Router) + TypeScript + Prisma + Postgres**.

---

## Módulos implementados

| # | Módulo | Rota | Destaques |
| - | --- | --- | --- |
| 1 | **Mapeamento Comportamental** | `/colaboradores`, `/profiler`, `/comparar` | Profiler DISC (20 grupos), scoring 0–100, arquétipos, compatibilidade entre perfis |
| 2 | **Engenharia de Cargos** | `/cargos` | Descrição, roda de competências, perfil DISC ideal, organograma, **fit colaborador × cargo** |
| 3 | **Recrutamento (ATS)** | `/recrutamento` | Vaga a partir do cargo, pipeline Kanban (9 etapas), score de aderência, KPIs |
| 4 | **Onboarding** | `/onboarding` | Plano dos primeiros 90 dias, checklist por categoria, progresso |
| 5 | **Employee Hub** | `/colaboradores/[id]` | Cadastro mestre: dados, DNA, cargo/gestor, histórico, performance, PDI, LMS |
| 6 | **Performance & PDI** | `/performance` | Avaliações 90/180/360 + auto, competências, PDI com plano de ação, KPIs |
| 7 | **Retenção & Engajamento** | `/engajamento` | Pesquisas (clima, eNPS, pulse), cálculo de eNPS, mural de reconhecimento |
| 8 | **People Analytics** | `/analytics` | Painel executivo: headcount, turnover, eNPS, performance, risco, distribuições |
| ★ | **Metas (OKRs)** | `/okrs` | Objetivos por empresa/área/indivíduo, key results com progresso |
| ★ | **Sucessão (Nine Box)** | `/nine-box` | Matriz 9-Box desempenho × potencial, identificação de HiPos |
| ★ | **LMS (Treinamentos)** | `/lms` | Catálogo de cursos, matrículas, progresso e conclusão |

Todos os módulos leem/escrevem no mesmo banco e reaproveitam o DNA
Comportamental (ex.: o *fit ao cargo* e o *score de aderência* do ATS usam a
função `compatibility()` do Módulo 1).

---

## Como rodar

```bash
cd rh-platform
npm install

cp .env.example .env          # ajuste DATABASE_URL (Postgres local ou Vercel/Neon)
npm run db:push               # cria as tabelas
npm run db:seed               # popula dados de exemplo (todos os módulos)
npm run dev                   # http://localhost:3000
```

Verificar o motor de scoring DISC sem banco:

```bash
npm run test:disc
```

---

## Metodologia DISC (Módulo 1)

Questionário de **escolha forçada**: em cada grupo de 4 adjetivos (um por fator
D, I, S, C) marca-se o que **mais** e o que **menos** combina. Scoring em
`src/lib/disc/score.ts`: `mais` +1 / `menos` −1 por fator; normalização
`(bruto + n) / (2n)` → 0–100; primário/secundário; arquétipos (D=Executor,
I=Comunicador, S=Planejador, C=Analista). `compatibility(a, b)` = `100 −
distância média entre os 4 fatores`.

---

## Estrutura

```
rh-platform/
├── prisma/
│   ├── schema.prisma        # todos os modelos (11 módulos)
│   └── seed.ts              # dados de exemplo end-to-end
└── src/
    ├── lib/
    │   ├── db.ts            # Prisma singleton
    │   ├── collaborators.ts # Employee Hub (agrega todos os módulos)
    │   ├── analytics.ts     # People Analytics + Nine Box
    │   ├── positions.ts · recruitment.ts · onboarding.ts
    │   ├── performance.ts · engagement.ts · okr.ts · lms.ts
    │   └── disc/            # motor DISC + testes
    ├── components/          # DiscBars, DiscBadge, DbNotice
    └── app/
        ├── page.tsx         # dashboard
        ├── colaboradores/ cargos/ recrutamento/ onboarding/
        ├── performance/ engajamento/ analytics/
        ├── okrs/ nine-box/ lms/
        └── api/             # rotas REST de cada módulo
```

---

## Roadmap — IA para RH

Camada de IA prevista (requer integração com um provedor de LLM):
geração automática de descrições de cargo, sugestão de competências, triagem e
resumo de currículos, match inteligente candidato × vaga, sugestão de PDIs e
assistente de RH por chat. A modelagem já suporta esses fluxos (competências,
perfis, respostas cruas dos testes ficam persistidas para reuso).

Outros próximos passos: autenticação e multi-tenant (empresa), divulgação
automática de vagas (job boards), e novos instrumentos comportamentais
(`AssessmentType` já prevê Big Five, motivacional e liderança).
