import { PrismaClient } from "@prisma/client";

// Cadastro da folha real da B4You (grupo com 3 empresas: B4You, Acelera Marca
// e Brands). Idempotente: faz upsert por e-mail, sem apagar outros dados.
// Rode com: npm run db:seed:team

const prisma = new PrismaClient();

const GROUP = "Grupo B4You";
const COMPANIES = ["B4You", "Acelera Marca", "Brands", GROUP];

/** Mapeia o rotulo bruto da planilha para as empresas canonicas. */
function companiesFor(label: string): string[] {
  switch (label.trim()) {
    case "B4You":
      return ["B4You"];
    case "Acelera Marca":
      return ["Acelera Marca"];
    case "Br4nds":
    case "Brands":
      return ["Brands"];
    case "Grupo B4You":
      return [GROUP];
    case "B4You e Acelera Marca":
      return ["B4You", "Acelera Marca"];
    default:
      return [];
  }
}

function parseSalary(s: string): number | null {
  if (!s) return null;
  if (/vari/i.test(s)) return null; // "Variável"
  const cleaned = s.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

function parseDate(d: string): Date | null {
  if (!d) return null;
  const parts = d.split("/").map((x) => Number(x));
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

const PARTICLES = new Set(["de", "da", "do", "dos", "das", "e"]);
function emailFor(name: string): string {
  const slug = name
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // remove acentos (marcas de combinacao) e simbolos
    .trim()
    .split(/\s+/)
    .filter((t) => t && !PARTICLES.has(t))
    .join(".");
  return `${slug || "colaborador"}@grupob4you.com.br`;
}

type Row = {
  name: string;
  birth: string;
  role: string;
  dept: string;
  company: string;
  salary: string;
};

const PEOPLE: Row[] = [
  { name: "Ana Raquel Morais de Andrade", birth: "21/10/1994", role: "Assistente de Suporte ao Cliente", dept: "Sucesso do Cliente", company: "B4You", salary: "R$ 1.300,00" },
  { name: "Leonardo Neves das Chagas", birth: "02/11/2000", role: "Desenvolvedor Sênior", dept: "TI", company: "B4You", salary: "R$ 9.500,00" },
  { name: "Jefferson G Silva", birth: "19/01/1989", role: "Desenvolvedor Sênior", dept: "TI", company: "B4You", salary: "R$ 11.437,50" },
  { name: "Ivana Patricia Oliveira Bispo", birth: "27/02/2000", role: "Gerente de CS", dept: "Sucesso do Cliente", company: "B4You", salary: "R$ 3.000,00" },
  { name: "Johab Vinicius Silva Gomes", birth: "23/01/2004", role: "Desenvolvedor de Software", dept: "TI", company: "B4You", salary: "R$ 4.700,00" },
  { name: "Débora Káren Martins de Almeida", birth: "16/05/1998", role: "Analista de Fraude", dept: "Fraude", company: "B4You", salary: "R$ 6.000,00" },
  { name: "Fernando Hiyane de Moura", birth: "07/09/1999", role: "Product Marketing Manager", dept: "Marketing", company: "B4You", salary: "R$ 4.200,00" },
  { name: "Eduardo Luiz Almeida da Silva Junior", birth: "22/02/1991", role: "Head de Marca", dept: "Marcas", company: "Br4nds", salary: "R$ 5.000,00" },
  { name: "Ana Luisa dos Santos", birth: "01/08/2001", role: "Head de Conteúdo", dept: "Marketing", company: "B4You", salary: "R$ 5.500,00" },
  { name: "Felipe Oliveira dos Santos", birth: "09/09/2000", role: "Filmmaker/Editor de Vídeo", dept: "Marketing", company: "B4You", salary: "R$ 2.500,00" },
  { name: "Mikahellen Rodrigues Barbosa", birth: "10/04/2002", role: "Analista Financeiro", dept: "Administrativo/Financeiro", company: "B4You", salary: "R$ 3.250,00" },
  { name: "Jean Claude Souza dos Santos", birth: "23/08/1992", role: "Estrategista de Conteúdo", dept: "Marketing", company: "Acelera Marca", salary: "R$ 8.500,00" },
  { name: "Jannine dos Santos Gazola", birth: "30/06/1995", role: "SDR", dept: "Comercial", company: "Acelera Marca", salary: "R$ 3.250,00" },
  { name: "Evelyn Rodrigues de Oliveira", birth: "01/07/1993", role: "Analista de RH", dept: "RH", company: "Grupo B4You", salary: "R$ 5.500,00" },
  { name: "Kalebe Nathanael de Paula Almeida", birth: "29/06/1999", role: "Desenvolvedor Sênior Estratégico", dept: "TI", company: "B4You", salary: "R$ 12.000,00" },
  { name: "Arthur Viana Filho", birth: "24/06/1998", role: "Diretor de Marketing", dept: "Diretoria", company: "B4You e Acelera Marca", salary: "R$ 8.000,00" },
  { name: "Bruno Leandro Araújo de Souza", birth: "12/03/1992", role: "Conselheiro/Sócio", dept: "Diretoria", company: "Grupo B4You", salary: "R$ 0,00" },
  { name: "Danilo de Maria", birth: "02/02/1993", role: "Desenvolvedor Sênior Estratégico", dept: "TI", company: "B4You", salary: "R$ 9.000,00" },
  { name: "Davi Pereira Speck Alves", birth: "02/05/2002", role: "Líder Técnico", dept: "TI", company: "B4You", salary: "R$ 16.000,00" },
  { name: "Allan", birth: "", role: "", dept: "", company: "", salary: "" },
  { name: "Miguel da Silva Santos", birth: "14/11/2006", role: "Copywriter", dept: "Marketing", company: "Acelera Marca", salary: "R$ 2.500,00" },
  { name: "Matheus Mota Leonis", birth: "09/01/1996", role: "CEO", dept: "Conselho", company: "Grupo B4You", salary: "R$ 10.000,00" },
  { name: "Natã Oliveira", birth: "22/04/1992", role: "Sócio", dept: "Diretoria", company: "Grupo B4You", salary: "R$ 0,00" },
  { name: "Mickaelly Dantas Rangel", birth: "07/12/1993", role: "Assistente de Suporte ao Cliente", dept: "Sucesso do Cliente", company: "B4You", salary: "R$ 1.800,00" },
  { name: "Bruno Mesquita Meirelles", birth: "08/11/1995", role: "Closer", dept: "Comercial", company: "Acelera Marca", salary: "R$ 2.500,00" },
  { name: "Lucas Grillo da Fonseca", birth: "21/10/1997", role: "Coordenador de CS", dept: "Sucesso do Cliente", company: "B4You", salary: "R$ 4.000,00" },
  { name: "Vinicius da Palma Martins", birth: "06/02/1994", role: "Desenvolvedor Sênior Estratégico", dept: "TI", company: "B4You", salary: "R$ 11.500,00" },
  { name: "Vinícius Damasceno da Silva", birth: "05/04/1997", role: "Gerente de Operações", dept: "Outro", company: "Acelera Marca", salary: "R$ 5.000,00" },
  { name: "Daniel Ramalho Penha Virginio", birth: "20/01/1998", role: "Analista de Business Intelligence", dept: "Outro", company: "B4You e Acelera Marca", salary: "R$ 4.500,00" },
  { name: "José Ismar Ferreira de Sá", birth: "22/12/1994", role: "Analista de Fraude", dept: "Fraude", company: "B4You", salary: "R$ 5.700,00" },
  { name: "Maria Eduarda Monteiro Suzana", birth: "27/10/2006", role: "Assistente de Suporte ao Cliente", dept: "Sucesso do Cliente", company: "B4You", salary: "R$ 1.080,90" },
  { name: "Raphael de Azevedo Ferreira", birth: "24/09/1997", role: "Closer", dept: "Comercial", company: "Acelera Marca", salary: "R$ 3.000,00" },
  { name: "Rodrigo Cecílio Dias de Oliveira", birth: "13/06/2002", role: "Desenvolvedor de Software", dept: "TI", company: "B4You", salary: "R$ 4.000,00" },
  { name: "Gabriel Felix Alves", birth: "04/05/2007", role: "Assistente de Suporte ao Cliente (Implantação)", dept: "Sucesso do Cliente", company: "B4You", salary: "R$ 1.000,00" },
  { name: "Luiz Fernando Santos do Nascimento", birth: "06/01/2002", role: "Analista de CS", dept: "Sucesso do Cliente", company: "Acelera Marca", salary: "R$ 3.000,00" },
  { name: "Vinicius Oliveira da Silva", birth: "21/11/2006", role: "Estagiário de Contabilidade", dept: "Administrativo/Financeiro", company: "B4You", salary: "R$ 800,00" },
  { name: "Milena Moraes Contoned Braga", birth: "16/05/1999", role: "Gerente de CS", dept: "Sucesso do Cliente", company: "B4You", salary: "R$ 2.500,00" },
  { name: "Raphael Bastos Oliveira", birth: "27/06/2001", role: "Gestor de Tráfego Pago", dept: "Marketing", company: "Br4nds", salary: "Variável" },
  { name: "Gabriel Monegatto", birth: "05/02/1993", role: "Head de CRO & Growth", dept: "Marketing", company: "Br4nds", salary: "R$ 5.000,00" },
  { name: "Rayssa Emily Souza Santos", birth: "14/03/1997", role: "Social Seller", dept: "Comercial", company: "Acelera Marca", salary: "R$ 2.500,00" },
  { name: "Kaio Victor Ferreira da Silva", birth: "15/07/2007", role: "Storymaker", dept: "Marketing", company: "Acelera Marca", salary: "R$ 2.500,00" },
  { name: "Ellen Mota Veras Lopes", birth: "18/12/1995", role: "Diretor Administrativo/Financeiro", dept: "Diretoria", company: "Grupo B4You", salary: "R$ 8.000,00" },
  { name: "Cristiano Dias", birth: "21/12/1995", role: "Sócio", dept: "Diretoria", company: "Acelera Marca", salary: "R$ 0,00" },
  { name: "Evelyn Veras Lopes", birth: "20/12/2004", role: "Assistente de Marketing", dept: "Marketing", company: "B4You", salary: "R$ 2.000,00" },
  { name: "Leonardo Ferreira Nascimento", birth: "30/06/1995", role: "Sócio", dept: "Produto", company: "Grupo B4You", salary: "R$ 0,00" },
  { name: "Thaís Portilho Baars de Araujo", birth: "31/10/1997", role: "Gerente de Operações", dept: "Operações", company: "B4You e Acelera Marca", salary: "R$ 4.500,00" },
  { name: "Ursula Silva Cavalcante de Abreu", birth: "19/12/1995", role: "SDR", dept: "Comercial", company: "Acelera Marca", salary: "R$ 1.400,00" },
  { name: "Thalita Soares Machado", birth: "29/03/2003", role: "Designer", dept: "Marketing", company: "B4You", salary: "R$ 2.500,00" },
  { name: "João Vitor de Souza Diroteldes", birth: "03/03/2002", role: "Head de Inovação IA", dept: "TI", company: "B4You", salary: "R$ 10.000,00" },
  { name: "Bruno Gabriel Ramos Cerqueira da Silva", birth: "02/11/1996", role: "Web Designer", dept: "TI", company: "Br4nds", salary: "R$ 3.500,00" },
  { name: "Sarah Giovanna Teixeira", birth: "18/08/2006", role: "Analista de CS", dept: "Sucesso do Cliente", company: "Acelera Marca", salary: "R$ 4.000,00" },
  { name: "Isabella Santos Pereira", birth: "23/07/2005", role: "Social Media", dept: "Marketing", company: "Br4nds", salary: "R$ 3.000,00" },
  { name: "Kaith Campos Báfica Carvalho", birth: "06/06/1996", role: "Assistente Administrativo", dept: "Administrativo/Financeiro", company: "B4You", salary: "R$ 3.050,00" },
  { name: "Gabriel Ramalho Virgínio", birth: "22/12/1996", role: "Sócio", dept: "Diretoria", company: "B4You e Acelera Marca", salary: "R$ 0,00" },
  { name: "Nayra Kelle dos Santos Caldas", birth: "03/03/1999", role: "Designer", dept: "Marketing", company: "B4You", salary: "R$ 2.500,00" },
];

async function main() {
  console.log("Criando empresas do grupo...");
  const companyIds: Record<string, string> = {};
  for (const name of COMPANIES) {
    const c = await prisma.company.upsert({
      where: { name },
      update: {},
      create: { name, isGroup: name === GROUP },
    });
    companyIds[name] = c.id;
  }

  console.log(`Cadastrando ${PEOPLE.length} colaboradores...`);
  let ok = 0;
  for (const p of PEOPLE) {
    const email = emailFor(p.name);
    const compIds = companiesFor(p.company)
      .map((n) => companyIds[n])
      .filter(Boolean)
      .map((id) => ({ id }));

    const data = {
      name: p.name,
      role: p.role || null,
      department: p.dept || null,
      status: "ACTIVE" as const,
      birthDate: parseDate(p.birth),
      salary: parseSalary(p.salary),
    };

    await prisma.collaborator.upsert({
      where: { email },
      update: { ...data, companies: { set: compIds } },
      create: { ...data, email, companies: { connect: compIds } },
    });
    ok++;
  }

  console.log(`Concluido: ${ok} colaboradores cadastrados/atualizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
