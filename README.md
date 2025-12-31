# 💰 Sistema de Planejamento Financeiro v10.12

> Sistema financeiro completo com features avançadas: controle, analytics, investimentos, empréstimos e muito mais!

[![Version](https://img.shields.io/badge/version-10.12.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## 🎯 Sobre o Projeto

Sistema financeiro completo e profissional com **TODAS** as features que você precisa:

- ✅ Controle completo de receitas e despesas
- ✅ Orçamentos inteligentes
- ✅ **Cartões de crédito** com faturas mensais
- ✅ **Parcelamentos** (Price/SAC/Americano)
- ✅ **Portfolio de investimentos** com cálculo de IR
- ✅ **Empréstimos** com amortização
- ✅ **Bill Splitting** (dividir contas com amigos)
- ✅ **Detecção de recorrências** com Machine Learning
- ✅ **Analytics avançado** e tendências
- ✅ **Simulações financeiras** ("E se?")
- ✅ **Exportar** Excel/PDF
- ✅ **2FA**, Audit Logs, Sessions
- ✅ **Performance otimizada** (70+ indexes)

---

## 📊 Estatísticas do Sistema

```
📁 Total de arquivos: 59
📝 Linhas de código: ~18.940
🎨 Componentes React: 204+
🗄️ Tabelas MySQL: 23
🔌 Endpoints tRPC: 120+
📊 Database Indexes: 70+
🚀 Routers: 18
📚 Services: 20
```

**Valor estimado:** R$ 50.000+ em desenvolvimento profissional!

---

## 🚀 Início Rápido (5 minutos)

### Pré-requisitos

- **Node.js** >= 18.0.0
- **MySQL** >= 8.0
- **Redis** (opcional, para cache)

### 1️⃣ Instalar

```bash
git clone <seu-repo>
cd planejamento-financeiro-v10.0
npm install
```

### 2️⃣ Configurar .env

```bash
cp .env.example .env
nano .env  # Configure suas credenciais
```

Mínimo necessário:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `SESSION_SECRET`

### 3️⃣ Criar Database

```bash
mysql -u root -p
CREATE DATABASE financeiro_v10;
exit;
```

### 4️⃣ Rodar Migrations

```bash
npm run db:migrate
```

### 5️⃣ Iniciar

```bash
npm run dev
```

**Pronto!** Acesse http://localhost:3000 🎉

---

## 📦 Scripts NPM

```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm start            # Produção
npm run db:migrate   # Migrations
npm run db:seed      # Dados exemplo
npm run db:backup    # Backup
npm run setup        # Setup inicial
```

---

## 💎 Features Detalhadas

### 💳 Cartões de Crédito
- Múltiplos cartões
- Faturas mensais automáticas
- Controle de limite disponível
- Dashboard completo

### 📦 Parcelamentos
- **Sistema Price** - Parcelas fixas
- **Sistema SAC** - Parcelas decrescentes
- **Sistema Americano** - Só juros
- Simulador antes de criar

### 📈 Investimentos
- Portfolio completo
- Transações (compra/venda/dividendos)
- **Cálculo automático de IR** (Regressivo/Progressivo)
- Sugestão de rebalanceamento

### 💰 Empréstimos
- Price, SAC ou Americano
- Cronograma completo
- Amortização automática
- Comparação de sistemas

### 👥 Bill Splitting
- Dividir contas entre amigos
- Divisão: igual, percentual, custom
- Rastreamento de pagamentos
- Dashboard completo

### 🔄 Recorrências Inteligentes (ML)
- **Detecção automática** de padrões
- Confidence score
- Previsão de próximas despesas
- Alertas antes do vencimento

### 📊 Analytics & ML
- **Regressão Linear** para tendências
- Categorias problemáticas
- Previsão próximo mês
- Padrões sazonais
- **Score de saúde financeira** (0-100)

### 🎲 Simulações "E se?"
- Taxa de poupança
- Redução de gastos por categoria
- Aumento de renda
- Tempo para atingir meta
- **Aposentadoria** (juros compostos)
- Comparação de múltiplos cenários

### 📄 Exportação
- Excel (.xlsx)
- PDF
- Relatórios customizados
- Dashboard completo

---

## 🔐 Segurança

- ✅ **2FA** com Google Authenticator
- ✅ **Audit Logs** completo
- ✅ **Session Management**
- ✅ **Rate Limiting**
- ✅ SQL Injection Protection
- ✅ XSS Protection
- ✅ CSRF Protection
- ✅ Bcrypt Password Hashing

---

## 🏗️ Arquitetura

```
planejamento-financeiro-v10.0/
├── client/              # React + TypeScript
│   ├── src/components/  # 204+ componentes
│   └── src/pages/       # Páginas
├── server/              # Node.js + tRPC
│   ├── routes/          # 18 routers
│   ├── services/        # 20 services
│   └── middleware/      # Rate limit, auth
├── drizzle/             # 7 migrations SQL
└── scripts/             # Setup, migrate, backup
```

**Stack:**
- Frontend: React 18, TypeScript, Tailwind, shadcn/ui
- Backend: Node.js, tRPC, Drizzle ORM
- Database: MySQL 8.0 (70+ indexes)
- Cache: Redis (opcional)

---

## 🎯 Roadmap

### v11.0 (Q1 2025)
- [ ] App Mobile (React Native)
- [ ] Open Finance Integration
- [ ] ML Avançado
- [ ] Chatbot IA

### v12.0 (Q2 2025)
- [ ] Multi-tenancy
- [ ] White-label
- [ ] API Pública
- [ ] Marketplace

---

## 📸 Screenshots

> (Adicione aqui screenshots do seu sistema)

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/MinhaFeature`)
3. Commit (`git commit -m 'Add MinhaFeature'`)
4. Push (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📝 Licença

MIT License - Veja [LICENSE](LICENSE)

---

## 👨‍💻 Autor

Desenvolvido com ❤️ e muito ☕

---

## 🙏 Agradecimentos

- React, Node.js, tRPC, Drizzle ORM
- Tailwind CSS, shadcn/ui
- Toda a comunidade open source

---

## ⭐ Star o Projeto

Se este projeto te ajudou, considere dar uma ⭐!

---

<div align="center">

**Sistema Financeiro v10.12 - Completo e Profissional**

Made with ❤️

</div>
