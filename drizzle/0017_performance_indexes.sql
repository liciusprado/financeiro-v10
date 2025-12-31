-- Migration: Performance Indexes
-- Versão: 10.7.0
-- Otimização de queries com índices estratégicos

-- ========== TRANSACTIONS ==========
-- Índices mais críticos para performance

-- Query: Buscar transações de um usuário por data
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON transactions(user_id, date DESC);

-- Query: Buscar transações por usuário e categoria
CREATE INDEX IF NOT EXISTS idx_transactions_user_category 
ON transactions(user_id, category);

-- Query: Buscar transações por usuário, tipo e data
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
ON transactions(user_id, type, date DESC);

-- Query: Buscar por valor (para relatórios de gastos altos)
CREATE INDEX IF NOT EXISTS idx_transactions_amount 
ON transactions(amount);

-- Query: Buscar transações recorrentes
CREATE INDEX IF NOT EXISTS idx_transactions_recurring 
ON transactions(recurring) WHERE recurring = TRUE;

-- Query: Full-text search em descrição
CREATE FULLTEXT INDEX IF NOT EXISTS idx_transactions_description_fulltext 
ON transactions(description);

-- ========== GOALS ==========

-- Query: Buscar metas ativas de um usuário
CREATE INDEX IF NOT EXISTS idx_goals_user_status 
ON goals(user_id, status);

-- Query: Buscar metas por deadline
CREATE INDEX IF NOT EXISTS idx_goals_user_deadline 
ON goals(user_id, deadline);

-- Query: Metas próximas de vencer
CREATE INDEX IF NOT EXISTS idx_goals_deadline 
ON goals(deadline) WHERE status = 'active';

-- ========== BUDGETS ==========

-- Query: Buscar orçamentos de um período
CREATE INDEX IF NOT EXISTS idx_budgets_user_period 
ON budgets(user_id, year, month);

-- Query: Buscar orçamento por categoria
CREATE INDEX IF NOT EXISTS idx_budgets_user_category 
ON budgets(user_id, category);

-- Query: Orçamentos ativos
CREATE INDEX IF NOT EXISTS idx_budgets_active 
ON budgets(is_active) WHERE is_active = TRUE;

-- ========== INVESTMENTS ==========

-- Query: Buscar investimentos por usuário e tipo
CREATE INDEX IF NOT EXISTS idx_investments_user_type 
ON investments(user_id, type);

-- Query: Investimentos por data de compra
CREATE INDEX IF NOT EXISTS idx_investments_user_purchase_date 
ON investments(user_id, purchase_date DESC);

-- ========== AUDIT LOGS ==========

-- Query: Buscar logs de um usuário por data
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
ON audit_logs(user_id, created_at DESC);

-- Query: Buscar logs por entidade
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs(entity_type, entity_id);

-- Query: Buscar logs por ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action, created_at DESC);

-- Query: Logs com erro
CREATE INDEX IF NOT EXISTS idx_audit_logs_status 
ON audit_logs(status) WHERE status IN ('failed', 'warning');

-- ========== USER SESSIONS ==========

-- Query: Buscar sessões ativas de um usuário
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active 
ON user_sessions(user_id, is_active, expires_at);

-- Query: Buscar por token
CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
ON user_sessions(session_token);

-- Query: Limpar sessões expiradas
CREATE INDEX IF NOT EXISTS idx_user_sessions_expired 
ON user_sessions(expires_at) WHERE is_active = TRUE;

-- ========== SECURITY ALERTS ==========

-- Query: Alertas não lidos de um usuário
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_unread 
ON security_alerts(user_id, is_read, created_at DESC);

-- Query: Alertas críticos
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity 
ON security_alerts(severity, is_read) WHERE severity = 'critical';

-- ========== CATEGORIES ==========

-- Query: Categorias ativas de um usuário
CREATE INDEX IF NOT EXISTS idx_categories_user_active 
ON categories(user_id, is_active) WHERE is_active = TRUE;

-- Query: Categorias por tipo
CREATE INDEX IF NOT EXISTS idx_categories_type 
ON categories(type);

-- ========== RECURRING TRANSACTIONS ==========

-- Query: Recorrências ativas
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active 
ON recurring_transactions(user_id, is_active, next_date);

-- Query: Recorrências a processar
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_date 
ON recurring_transactions(next_date) WHERE is_active = TRUE;

-- ========== NOTIFICATIONS ==========

-- Query: Notificações não lidas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC);

-- Query: Notificações por tipo
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON notifications(type, created_at DESC);

-- ========== COLLABORATION ==========

-- Query: Membros de um grupo
CREATE INDEX IF NOT EXISTS idx_group_members_group 
ON group_members(group_id, role);

-- Query: Grupos de um usuário
CREATE INDEX IF NOT EXISTS idx_group_members_user 
ON group_members(user_id);

-- Query: Aprovações pendentes
CREATE INDEX IF NOT EXISTS idx_approvals_pending 
ON approvals(approver_id, status) WHERE status = 'pending';

-- ========== GAMIFICATION ==========

-- Query: Ranking de usuários por XP
CREATE INDEX IF NOT EXISTS idx_gamification_xp 
ON gamification(current_xp DESC, level DESC);

-- Query: Streaks ativas
CREATE INDEX IF NOT EXISTS idx_gamification_streak 
ON gamification(current_streak DESC);

-- ========== OPEN BANKING ==========

-- Query: Contas conectadas de um usuário
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user 
ON bank_accounts(user_id, is_active);

-- Query: Sincronizações recentes
CREATE INDEX IF NOT EXISTS idx_bank_sync_history_account 
ON bank_sync_history(account_id, synced_at DESC);

-- ========== COMPOSITE INDEXES ==========
-- Índices compostos para queries complexas frequentes

-- Dashboard: Transações do mês atual
CREATE INDEX IF NOT EXISTS idx_transactions_dashboard 
ON transactions(user_id, date DESC, type, amount);

-- Relatórios: Gastos por categoria e período
CREATE INDEX IF NOT EXISTS idx_transactions_reports 
ON transactions(user_id, category, date DESC, amount);

-- Busca: Transações por texto e data
CREATE INDEX IF NOT EXISTS idx_transactions_search 
ON transactions(user_id, date DESC);

-- ========== ANALYZE TABLES ==========
-- Atualizar estatísticas para o otimizador de queries

ANALYZE TABLE transactions;
ANALYZE TABLE goals;
ANALYZE TABLE budgets;
ANALYZE TABLE investments;
ANALYZE TABLE audit_logs;
ANALYZE TABLE user_sessions;
ANALYZE TABLE security_alerts;

-- ========== QUERY OPTIMIZATION HINTS ==========

/*
NOTAS DE PERFORMANCE:

1. COVERING INDEXES:
   Alguns índices incluem todas as colunas necessárias para a query,
   evitando acesso à tabela principal.

2. PARTIAL INDEXES:
   Índices com WHERE clause são menores e mais eficientes para
   queries específicas (ex: apenas registros ativos).

3. DESCENDING INDEXES:
   Índices DESC são otimizados para ORDER BY DESC comum em feeds.

4. FULLTEXT INDEXES:
   Permitem busca textual eficiente em descrições.

5. COMPOUND INDEXES:
   Ordem das colunas importa! Coloque as mais seletivas primeiro.

MONITORAMENTO:

-- Ver índices não utilizados:
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'planejamento_financeiro'
  AND INDEX_NAME NOT IN (
    SELECT DISTINCT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE CARDINALITY > 0
  );

-- Ver tamanho dos índices:
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  ROUND(STAT_VALUE * @@innodb_page_size / 1024 / 1024, 2) AS size_mb
FROM mysql.innodb_index_stats
WHERE database_name = 'planejamento_financeiro'
  AND stat_name = 'size'
ORDER BY STAT_VALUE DESC;

-- Ver queries lentas:
SELECT 
  query_time,
  lock_time,
  rows_examined,
  rows_sent,
  sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 10;
*/

COMMIT;
