# Planejamento Financeiro Familiar

Sistema web para controle e planejamento financeiro mensal do casal, permitindo o registro de receitas, despesas e investimentos com acompanhamento de metas versus valores reais.

## Funcionalidades

### Categorias Financeiras

O sistema organiza as finanças em cinco categorias principais:

- **ENTRADAS (+)**: Receitas como salários e outras rendas
- **ALUNOS DE PERSONAL (+)**: Receitas de aulas de personal trainer
- **INVESTIMENTOS (-)**: Aplicações financeiras e reservas
- **FIXO OBRIGATÓRIO (-)**: Despesas fixas mensais (parcelas, contas, seguros, etc.)
- **VARIÁVEL / CARTÃO (-)**: Despesas variáveis (cartões, PIX, consultas, etc.)

### Controle Individual e Compartilhado

Cada lançamento pode ser registrado separadamente para Lícius e Marielly, com:
- **Meta**: Valor planejado para o mês
- **Real**: Valor efetivamente gasto/recebido
- **Total Casal**: Soma automática dos valores reais de ambos

### Dashboard Financeiro

O dashboard principal apresenta:
- **Cards de Resumo**: Totais de receitas, despesas, investimentos e saldo
- **Navegação Mensal**: Navegue entre meses para visualizar histórico
- **Tabelas por Categoria**: Visualização organizada de todos os itens
- **Edição Inline**: Clique nos campos para editar valores diretamente

### Indicadores Visuais

- Categorias de receita em **verde**
- Categorias de despesa em **vermelho**
- Categorias de investimento em **azul**
- Saldo positivo em **verde**, negativo em **vermelho**

## Como Usar

### Primeiro Acesso

1. Acesse o site e faça login com sua conta Manus
2. O sistema já vem pré-configurado com todas as categorias e itens da planilha original

### Registrando Valores

1. Selecione o mês desejado usando os botões de navegação no topo
2. Localize o item que deseja atualizar na tabela correspondente
3. Clique no campo que deseja editar (Meta ou Real, Lícius ou Marielly)
4. Digite o valor em reais (ex: 1500,00)
5. Pressione Enter ou clique fora do campo para salvar
6. Os totais são atualizados automaticamente

### Navegação entre Meses

Use os botões de seta (← →) ao lado do nome do mês para:
- Ver meses anteriores (histórico)
- Planejar meses futuros
- Comparar períodos diferentes

### Acompanhamento Financeiro

O dashboard mostra em tempo real:
- **Total de Receitas**: Soma de todas as entradas do mês
- **Total de Despesas**: Soma de todos os gastos fixos e variáveis
- **Total de Investimentos**: Soma dos valores investidos
- **Saldo Final**: Receitas - Despesas - Investimentos

## Estrutura de Dados

### Valores em Centavos

Internamente, todos os valores são armazenados em centavos para evitar problemas de arredondamento. A interface converte automaticamente para reais.

### Organização

- **Categorias**: Agrupam itens relacionados
- **Itens**: Representam cada linha da planilha (ex: "Salário Líquido", "Energia", etc.)
- **Lançamentos**: Valores mensais específicos para cada pessoa e item

## Tecnologias Utilizadas

- **Frontend**: React 19 + Tailwind CSS 4
- **Backend**: Express + tRPC 11
- **Banco de Dados**: MySQL/TiDB via Drizzle ORM
- **Autenticação**: Manus OAuth
- **Testes**: Vitest

## Desenvolvimento

### Comandos Disponíveis

```bash
# Iniciar servidor de desenvolvimento
pnpm dev

# Executar testes
pnpm test

# Atualizar schema do banco de dados
pnpm db:push

# Build para produção
pnpm build
```

### Estrutura do Projeto

```
client/src/
  pages/Dashboard.tsx    # Página principal do dashboard
  App.tsx               # Configuração de rotas e autenticação
  
server/
  routers.ts            # Procedures tRPC
  db.ts                 # Queries do banco de dados
  
drizzle/
  schema.ts             # Schema do banco de dados
```

## Suporte

Para dúvidas ou problemas, entre em contato através do sistema Manus.
