# Plataforma de RH (HRIS) — Módulo 1: Mapeamento Comportamental

MVP funcional do **primeiro módulo** da plataforma: o **Profiler DISC**, que gera
o **DNA Comportamental** de cada colaborador. Esse DNA é a base consumida por
todos os módulos seguintes (Engenharia de Cargos, ATS, Performance, etc.).

Stack: **Next.js 15 (App Router) + TypeScript + Prisma + Postgres**.

---

## O que já está implementado

| Recurso | Status |
| --- | --- |
| Cadastro de colaboradores (CRUD básico) | ✅ |
| Questionário DISC de escolha forçada (20 grupos) | ✅ |
| Motor de scoring DISC (normalização 0–100, primário/secundário, arquétipo) | ✅ |
| DNA Comportamental por colaborador + histórico de testes | ✅ |
| Compatibilidade comportamental entre dois colaboradores | ✅ |
| Dashboard (cobertura de mapeamento + distribuição por perfil) | ✅ |
| API REST (`/api/collaborators`, `/api/assessments`) | ✅ |
| Seed com 5 perfis de exemplo | ✅ |
| Testes do motor de scoring (`npm run test:disc`) | ✅ |

---

## Metodologia DISC

Questionário de **escolha forçada**: em cada grupo de 4 adjetivos (um por fator
D, I, S, C) o respondente marca o que **mais** e o que **menos** combina com ele.

Scoring (`src/lib/disc/score.ts`):

- `mais` → +1 no fator; `menos` → −1 no fator.
- Bruto por fator varia em `[-n, +n]`; normaliza para **0–100** via `(bruto + n) / (2n)`.
- **Primário** = fator de maior score; **secundário** = segundo. Empates seguem a
  ordem canônica D > I > S > C.
- Arquétipos: **D = Executor**, **I = Comunicador**, **S = Planejador**, **C = Analista**.
- `compatibility(a, b)` = `100 − (distância média entre os 4 fatores)`.

---

## Como rodar

```bash
cd rh-platform
npm install

# 1. Configurar o banco
cp .env.example .env
#   edite DATABASE_URL (Postgres local ou Vercel Postgres/Neon)

# 2. Criar as tabelas
npm run db:push

# 3. Popular dados de exemplo (opcional)
npm run db:seed

# 4. Subir a aplicação
npm run dev      # http://localhost:3000
```

Verificar o motor de scoring sem precisar de banco:

```bash
npm run test:disc
```

---

## Estrutura

```
rh-platform/
├── prisma/
│   ├── schema.prisma          # Collaborator + Assessment (DNA Comportamental)
│   └── seed.ts                # 5 colaboradores de exemplo
├── src/
│   ├── lib/
│   │   ├── db.ts              # Prisma singleton
│   │   ├── collaborators.ts   # camada de acesso a dados
│   │   └── disc/
│   │       ├── types.ts       # tipos do domínio
│   │       ├── questions.ts   # 20 grupos do questionário
│   │       ├── score.ts       # motor de scoring + compatibilidade
│   │       └── verify.ts      # testes do motor
│   ├── components/            # DiscBars, DiscBadge, DbNotice
│   └── app/
│       ├── page.tsx           # dashboard
│       ├── colaboradores/     # lista + detalhe (DNA)
│       ├── profiler/          # aplicação do teste
│       ├── comparar/          # compatibilidade
│       └── api/               # rotas REST
```

---

## Modelo de dados

`Assessment` guarda o perfil normalizado (`scoreD/I/S/C`, `primary`, `secondary`,
`profileName`) **e** as respostas cruas (`answers` em JSON) para auditoria e
recálculo futuro. O enum `AssessmentType` já prevê `BIG_FIVE`, `MOTIVATIONAL` e
`LEADERSHIP` — os próximos instrumentos do módulo.

---

## Como este módulo alimenta a plataforma

O DNA Comportamental é o insumo transversal do HRIS:

- **Engenharia de Cargos** — cada cargo terá um *perfil DISC ideal*; comparar
  com o DNA do colaborador dá o **fit colaborador × cargo** (reusa `compatibility()`).
- **Recrutamento (ATS)** — compõe o *score de aderência* do candidato à vaga.
- **Performance & PDI** — sugestões de desenvolvimento a partir do perfil.
- **Gestão de equipes** — compatibilidade gestor × liderado (já demonstrada em "Comparar perfis").

## Próximos passos sugeridos

1. Autenticação e multi-tenant (empresa).
2. Perfil DISC ideal por cargo (ponte para Engenharia de Cargos).
3. Big Five e perfil motivacional (novos `AssessmentType`).
4. Link público de teste para candidatos (integração com ATS).
