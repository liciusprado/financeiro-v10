-- Migration: User Preferences & Onboarding
-- Versão: 10.6.0

-- ========== TABELA: user_preferences ==========
-- Preferências e configurações do usuário
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  
  -- Onboarding
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  onboarding_step INT DEFAULT 0,
  onboarding_skipped BOOLEAN DEFAULT FALSE,
  
  -- Interface
  ui_mode ENUM('simple', 'advanced') DEFAULT 'simple',
  theme ENUM('light', 'dark', 'auto') DEFAULT 'auto',
  language VARCHAR(10) DEFAULT 'pt-BR',
  
  -- Dashboard
  default_dashboard_layout VARCHAR(50) DEFAULT 'default',
  show_tooltips BOOLEAN DEFAULT TRUE,
  
  -- Notifications
  enable_push_notifications BOOLEAN DEFAULT FALSE,
  enable_email_notifications BOOLEAN DEFAULT TRUE,
  notification_frequency ENUM('realtime', 'daily', 'weekly') DEFAULT 'daily',
  
  -- Privacy
  analytics_enabled BOOLEAN DEFAULT TRUE,
  data_sharing_enabled BOOLEAN DEFAULT FALSE,
  
  -- Features visibility (modo simples esconde features avançadas)
  show_gamification BOOLEAN DEFAULT TRUE,
  show_open_banking BOOLEAN DEFAULT TRUE,
  show_ai_features BOOLEAN DEFAULT TRUE,
  show_collaboration BOOLEAN DEFAULT TRUE,
  show_projects BOOLEAN DEFAULT TRUE,
  show_multi_currency BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_id),
  INDEX idx_mode (ui_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: faq_items ==========
-- Perguntas frequentes (FAQ)
CREATE TABLE IF NOT EXISTS faq_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  views INT DEFAULT 0,
  helpful_votes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_active (is_active),
  INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: user_help_interactions ==========
-- Rastrear quais ajudas/tutoriais o usuário já viu
CREATE TABLE IF NOT EXISTS user_help_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  help_type ENUM('tooltip', 'tour', 'faq', 'video', 'guide') NOT NULL,
  help_identifier VARCHAR(100) NOT NULL,
  interaction_type ENUM('viewed', 'completed', 'skipped', 'dismissed') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_id),
  INDEX idx_type (help_type),
  INDEX idx_identifier (help_identifier),
  UNIQUE KEY unique_interaction (user_id, help_type, help_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== Inserir FAQs iniciais ==========
INSERT INTO faq_items (category, question, answer, display_order) VALUES
-- Início
('inicio', 'Como começar a usar o sistema?', 'Bem-vindo! Primeiro, adicione suas primeiras despesas e receitas. Use o botão "+" no menu lateral ou no topo da página. O sistema vai te guiar com um tour interativo na primeira vez.', 1),
('inicio', 'Preciso conectar meu banco?', 'Não é obrigatório! Você pode adicionar transações manualmente. O Open Banking é opcional e serve para importar automaticamente suas transações bancárias.', 2),

-- Despesas e Receitas
('transacoes', 'Como adicionar uma despesa?', 'Clique no botão "+" ou vá em "Despesas" → "Nova Despesa". Preencha o valor, descrição, categoria e data. O sistema pode sugerir a categoria automaticamente!', 1),
('transacoes', 'Como categorizar minhas despesas?', 'Ao adicionar uma despesa, selecione a categoria. O sistema tem IA que aprende e sugere categorias baseado na descrição. Você também pode criar categorias personalizadas.', 2),
('transacoes', 'Posso editar ou deletar uma transação?', 'Sim! Clique na transação na lista e escolha "Editar" ou "Deletar". No modo colaborativo, algumas ações podem requerer aprovação.', 3),

-- Orçamentos
('orcamentos', 'Como criar um orçamento?', 'Vá em "Orçamentos" → "Novo Orçamento". Defina um valor limite para uma categoria e período (mensal, anual). O sistema vai alertar quando você ultrapassar.', 1),
('orcamentos', 'O que acontece se eu ultrapassar o orçamento?', 'Você receberá alertas automáticos quando chegar a 80% e 100% do orçamento. No dashboard, a categoria ficará em vermelho. Nada é bloqueado, são apenas avisos!', 2),

-- Metas
('metas', 'Como funcionam as metas?', 'Metas são objetivos financeiros (ex: "Economizar R$ 10.000 para viagem"). Defina o valor alvo, prazo e vá adicionando progresso. O sistema mostra quanto falta e se está no caminho certo!', 1),

-- PWA e Offline
('pwa', 'Posso usar sem internet?', 'Sim! Instale o app (botão no topo) e ele funcionará offline. Suas alterações sincronizam automaticamente quando você reconectar.', 1),
('pwa', 'Como instalar o app?', 'No Chrome: clique no ícone "Instalar" na barra de endereço. No Safari (iPhone): "Compartilhar" → "Adicionar à Tela de Início". No Android: "Menu" → "Instalar app".', 2),

-- Open Banking
('open-banking', 'É seguro conectar meu banco?', 'Sim! Usamos a Belvo, certificada pelo Banco Central. Suas credenciais são criptografadas e nunca são armazenadas no nosso servidor. Você pode desconectar a qualquer momento.', 1),
('open-banking', 'Quais bancos são suportados?', 'Suportamos 100+ bancos brasileiros: Banco do Brasil, Bradesco, Itaú, Santander, Caixa, Nubank, Inter, C6, BTG Pactual e muitos outros!', 2),

-- Gamificação
('gamificacao', 'Como ganhar XP?', 'Você ganha XP por ações: adicionar transações (+5 XP), bater metas (+200 XP), login diário (+10 XP), manter streak (+20 XP/dia após 7 dias). Complete conquistas e desafios para ganhar ainda mais!', 1),
('gamificacao', 'O que são conquistas?', 'São medalhas que você desbloqueia ao atingir marcos (ex: "Primeira despesa", "100 transações", "Economizou R$ 10.000"). Cada conquista dá XP bônus!', 2),

-- Colaborativo
('colaborativo', 'Como adicionar minha família?', 'Vá em "Modo Colaborativo" → "Adicionar Membro". Digite o email e escolha a permissão (Admin, Editor ou Viewer). Eles receberão um convite!', 1),
('colaborativo', 'Qual a diferença entre Admin, Editor e Viewer?', 'Admin: controle total. Editor: pode criar e editar transações. Viewer: só pode visualizar, não pode modificar nada.', 2),

-- Segurança
('seguranca', 'Meus dados estão seguros?', 'Sim! Usamos criptografia, HTTPS, autenticação JWT e seguimos as melhores práticas de segurança. Seus dados financeiros nunca são compartilhados sem sua permissão.', 1),
('seguranca', 'Posso exportar meus dados?', 'Sim! Vá em "Backup" para baixar todos os seus dados em formato JSON ou Excel. Você é dono dos seus dados!', 2),

-- Geral
('geral', 'O sistema é gratuito?', 'Para uso pessoal e familiar, sim! No futuro pode haver planos pagos para recursos avançados corporativos.', 1),
('geral', 'Funciona em celular?', 'Sim! O sistema é responsivo e funciona em qualquer dispositivo. Para melhor experiência, instale como PWA.', 2),
('geral', 'Posso importar dados de outro app?', 'Sim! Use "Importar CSV" no menu. Exporte seus dados do app anterior em CSV e importe aqui. O sistema vai mapear as colunas automaticamente.', 3);

COMMIT;
