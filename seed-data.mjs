import { drizzle } from "drizzle-orm/mysql2";
import { categories, items } from "./drizzle/schema.ts";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Iniciando seed do banco de dados...");

  // Categorias
  const categoriesData = [
    { name: "ENTRADAS (+)", type: "income", color: "blue", orderIndex: 1 },
    { name: "ALUNOS DE PERSONAL (+)", type: "income", color: "blue", orderIndex: 2 },
    { name: "INVESTIMENTOS (-)", type: "investment", color: "green", orderIndex: 3 },
    { name: "FIXO OBRIGATÓRIO (-)", type: "expense", color: "red", orderIndex: 4 },
    { name: "VARIÁVEL / CARTÃO (-)", type: "expense", color: "red", orderIndex: 5 },
  ];

  console.log("Inserindo categorias...");
  for (const cat of categoriesData) {
    await db.insert(categories).values(cat);
  }

  // Buscar IDs das categorias
  const allCategories = await db.select().from(categories);
  const entradas = allCategories.find(c => c.name === "ENTRADAS (+)");
  const alunos = allCategories.find(c => c.name === "ALUNOS DE PERSONAL (+)");
  const investimentos = allCategories.find(c => c.name === "INVESTIMENTOS (-)");
  const fixo = allCategories.find(c => c.name === "FIXO OBRIGATÓRIO (-)");
  const variavel = allCategories.find(c => c.name === "VARIÁVEL / CARTÃO (-)");

  // Itens
  const itemsData = [
    // Entradas
    { categoryId: entradas.id, name: "Salário Líquido", orderIndex: 1 },
    { categoryId: entradas.id, name: "Outras Rendas", orderIndex: 2 },
    
    // Alunos
    { categoryId: alunos.id, name: "Célvora", orderIndex: 1 },
    { categoryId: alunos.id, name: "Viviane", orderIndex: 2 },
    { categoryId: alunos.id, name: "Welshiella", orderIndex: 3 },
    { categoryId: alunos.id, name: "Hilda", orderIndex: 4 },
    { categoryId: alunos.id, name: "Victória", orderIndex: 5 },
    { categoryId: alunos.id, name: "Davi", orderIndex: 6 },
    { categoryId: alunos.id, name: "Valentina", orderIndex: 7 },
    { categoryId: alunos.id, name: "Manuela", orderIndex: 8 },
    { categoryId: alunos.id, name: "Alexander e Ivana", orderIndex: 9 },
    { categoryId: alunos.id, name: "Leonardo, Marcela e Milka", orderIndex: 10 },
    { categoryId: alunos.id, name: "Lúcia", orderIndex: 11 },
    { categoryId: alunos.id, name: "Cecília", orderIndex: 12 },
    { categoryId: alunos.id, name: "Beatriz", orderIndex: 13 },
    { categoryId: alunos.id, name: "Isabela", orderIndex: 14 },
    { categoryId: alunos.id, name: "Murilo", orderIndex: 15 },
    { categoryId: alunos.id, name: "Rosângela", orderIndex: 16 },
    { categoryId: alunos.id, name: "Isolda", orderIndex: 17 },
    { categoryId: alunos.id, name: "Jamil", orderIndex: 18 },
    { categoryId: alunos.id, name: "Tâmara", orderIndex: 19 },
    { categoryId: alunos.id, name: "Lígia", orderIndex: 20 },
    { categoryId: alunos.id, name: "Morali Tomates", orderIndex: 21 },
    { categoryId: alunos.id, name: "Biscoitos José Neto", orderIndex: 22 },
    { categoryId: alunos.id, name: "Semi-Joias", orderIndex: 23 },
    
    // Investimentos
    { categoryId: investimentos.id, name: "PROJETO CASA (CDB/LCI)", orderIndex: 1 },
    { categoryId: investimentos.id, name: "Reserva de Emergência", orderIndex: 2 },
    
    // Fixo Obrigatório
    { categoryId: fixo.id, name: "Parcela Lote Aldeia do Parque", orderIndex: 1 },
    { categoryId: fixo.id, name: "Condomínio Aldeia do Parque", orderIndex: 2 },
    { categoryId: fixo.id, name: "Financiamento Fiat Fastback", orderIndex: 3 },
    { categoryId: fixo.id, name: "Lote Parque Itália", orderIndex: 4 },
    { categoryId: fixo.id, name: "Empréstimo Dodge Journey", orderIndex: 5 },
    { categoryId: fixo.id, name: "Net/Claro Combo", orderIndex: 6 },
    { categoryId: fixo.id, name: "Plano de Saúde Ipasgo/Hapvida", orderIndex: 7 },
    { categoryId: fixo.id, name: "IPVA Fiat Fastback", orderIndex: 8 },
    { categoryId: fixo.id, name: "ITU Aldeia do Parque", orderIndex: 9 },
    { categoryId: fixo.id, name: "ITU Parque Itália", orderIndex: 10 },
    { categoryId: fixo.id, name: "Dra Simone Castro - Nutróloga", orderIndex: 11 },
    { categoryId: fixo.id, name: "Anuidade CREA/CREF", orderIndex: 12 },
    { categoryId: fixo.id, name: "Anuidade Mútua", orderIndex: 13 },
    { categoryId: fixo.id, name: "Mary - Sogrinha", orderIndex: 14 },
    { categoryId: fixo.id, name: "Dízimo", orderIndex: 15 },
    { categoryId: fixo.id, name: "Aula de Tênis", orderIndex: 16 },
    { categoryId: fixo.id, name: "Assinaturas/Youtube Premium", orderIndex: 17 },
    { categoryId: fixo.id, name: "Assinaturas/Netflix e Spotify", orderIndex: 18 },
    { categoryId: fixo.id, name: "Vinícius Personal", orderIndex: 19 },
    { categoryId: fixo.id, name: "Aluguel da Casa", orderIndex: 20 },
    { categoryId: fixo.id, name: "Energia", orderIndex: 21 },
    { categoryId: fixo.id, name: "Escola da Giovanna", orderIndex: 22 },
    { categoryId: fixo.id, name: "Empregada FGTS", orderIndex: 23 },
    { categoryId: fixo.id, name: "Empregada Salário", orderIndex: 24 },
    { categoryId: fixo.id, name: "Metlife Seguros e Previdência", orderIndex: 25 },
    { categoryId: fixo.id, name: "Allianz Seguros", orderIndex: 26 },
    { categoryId: fixo.id, name: "Plano Ativo 70 Gb", orderIndex: 27 },
    { categoryId: fixo.id, name: "Conta do Celular", orderIndex: 28 },
    
    // Variável
    { categoryId: variavel.id, name: "Fatura Cartão (C6 Bank)", orderIndex: 1 },
    { categoryId: variavel.id, name: "Fatura Cartão (Nubank)", orderIndex: 2 },
    { categoryId: variavel.id, name: "PIX/Dinheiro/Débito", orderIndex: 3 },
    { categoryId: variavel.id, name: "Tarifas/Juros/IOF", orderIndex: 4 },
    { categoryId: variavel.id, name: "Consultas/Exames", orderIndex: 5 },
  ];

  console.log("Inserindo itens...");
  for (const item of itemsData) {
    await db.insert(items).values(item);
  }

  console.log("Seed concluído com sucesso!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Erro ao executar seed:", error);
  process.exit(1);
});
