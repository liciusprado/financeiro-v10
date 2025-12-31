-- Migration: Bill Splitting & Smart Recurring
-- Versão: 10.11.0
-- Sistema de divisão de contas e detecção de recorrências

-- ========== BILL SPLITS (Divisão de Contas) ==========

CREATE TABLE IF NOT EXISTS bill_splits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL, -- Quem pagou
    transaction_id INT, -- Transação original (se houver)
    title VARCHAR(200) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    split_date DATE NOT NULL,
    status ENUM('pending', 'partially_paid', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    category VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_bill_splits_owner FOREIGN KEY (owner_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_splits_transaction FOREIGN KEY (transaction_id) 
        REFERENCES transactions(id) ON DELETE SET NULL,
        
    INDEX idx_bill_splits_owner (owner_id),
    INDEX idx_bill_splits_status (status),
    INDEX idx_bill_splits_date (split_date)
);

-- ========== SPLIT PARTICIPANTS (Participantes) ==========

CREATE TABLE IF NOT EXISTS split_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    split_id INT NOT NULL,
    user_id INT, -- NULL se não for usuário do sistema
    name VARCHAR(100) NOT NULL, -- Nome (pode ser externo)
    email VARCHAR(255), -- Email para notificação
    phone VARCHAR(20), -- Telefone para notificação
    amount_owed DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status ENUM('pending', 'paid', 'partial') NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50), -- pix, cash, transfer, etc
    paid_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_split_participants_split FOREIGN KEY (split_id) 
        REFERENCES bill_splits(id) ON DELETE CASCADE,
    CONSTRAINT fk_split_participants_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL,
        
    INDEX idx_split_participants_split (split_id),
    INDEX idx_split_participants_user (user_id),
    INDEX idx_split_participants_status (status)
);

-- ========== SPLIT PAYMENTS (Pagamentos Recebidos) ==========

CREATE TABLE IF NOT EXISTS split_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    participant_id INT NOT NULL,
    split_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_split_payments_participant FOREIGN KEY (participant_id) 
        REFERENCES split_participants(id) ON DELETE CASCADE,
    CONSTRAINT fk_split_payments_split FOREIGN KEY (split_id) 
        REFERENCES bill_splits(id) ON DELETE CASCADE,
        
    INDEX idx_split_payments_participant (participant_id),
    INDEX idx_split_payments_split (split_id),
    INDEX idx_split_payments_date (payment_date)
);

-- ========== RECURRING PATTERNS (Padrões Detectados) ==========

CREATE TABLE IF NOT EXISTS recurring_patterns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    average_amount DECIMAL(10, 2) NOT NULL,
    frequency ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
    confidence_score DECIMAL(3, 2) NOT NULL, -- 0.00 a 1.00
    last_occurrence DATE,
    next_predicted_date DATE,
    occurrences_count INT NOT NULL DEFAULT 0,
    is_confirmed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    merchant_name VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_recurring_patterns_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    INDEX idx_recurring_patterns_user (user_id),
    INDEX idx_recurring_patterns_active (user_id, is_active),
    INDEX idx_recurring_patterns_next_date (next_predicted_date)
);

-- ========== RECURRING OCCURRENCES (Ocorrências) ==========

CREATE TABLE IF NOT EXISTS recurring_occurrences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pattern_id INT NOT NULL,
    transaction_id INT NOT NULL,
    occurrence_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    was_predicted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_recurring_occurrences_pattern FOREIGN KEY (pattern_id) 
        REFERENCES recurring_patterns(id) ON DELETE CASCADE,
    CONSTRAINT fk_recurring_occurrences_transaction FOREIGN KEY (transaction_id) 
        REFERENCES transactions(id) ON DELETE CASCADE,
        
    INDEX idx_recurring_occurrences_pattern (pattern_id),
    INDEX idx_recurring_occurrences_transaction (transaction_id),
    INDEX idx_recurring_occurrences_date (occurrence_date)
);

-- ========== SHARED EXPENSES (Despesas Compartilhadas) ==========

CREATE TABLE IF NOT EXISTS shared_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT, -- Grupo colaborativo (se existir)
    creator_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    total_amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    expense_date DATE NOT NULL,
    split_method ENUM('equal', 'percentage', 'custom', 'shares') NOT NULL DEFAULT 'equal',
    status ENUM('pending', 'settled', 'cancelled') NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_shared_expenses_creator FOREIGN KEY (creator_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    INDEX idx_shared_expenses_creator (creator_id),
    INDEX idx_shared_expenses_group (group_id),
    INDEX idx_shared_expenses_status (status),
    INDEX idx_shared_expenses_date (expense_date)
);

-- ========== SHARED EXPENSE MEMBERS (Membros) ==========

CREATE TABLE IF NOT EXISTS shared_expense_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_id INT NOT NULL,
    user_id INT NOT NULL,
    share_amount DECIMAL(10, 2) NOT NULL,
    share_percentage DECIMAL(5, 2), -- Porcentagem (se aplicável)
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_shared_expense_members_expense FOREIGN KEY (expense_id) 
        REFERENCES shared_expenses(id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_expense_members_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    UNIQUE KEY uk_expense_user (expense_id, user_id),
    INDEX idx_shared_expense_members_expense (expense_id),
    INDEX idx_shared_expense_members_user (user_id),
    INDEX idx_shared_expense_members_status (status)
);

-- ========== VIEWS ÚTEIS ==========

-- View: Divisões pendentes
CREATE OR REPLACE VIEW v_pending_splits AS
SELECT 
    bs.id,
    bs.owner_id,
    bs.title,
    bs.total_amount,
    bs.split_date,
    COUNT(sp.id) as total_participants,
    SUM(sp.amount_owed) as total_owed,
    SUM(sp.amount_paid) as total_paid,
    bs.total_amount - SUM(sp.amount_paid) as remaining_amount,
    COUNT(CASE WHEN sp.status = 'paid' THEN 1 END) as paid_count
FROM bill_splits bs
LEFT JOIN split_participants sp ON bs.id = sp.split_id
WHERE bs.status != 'completed'
GROUP BY bs.id;

-- View: Próximas recorrências previstas
CREATE OR REPLACE VIEW v_upcoming_recurring AS
SELECT 
    rp.id,
    rp.user_id,
    rp.description,
    rp.average_amount,
    rp.frequency,
    rp.next_predicted_date,
    rp.confidence_score,
    DATEDIFF(rp.next_predicted_date, CURRENT_DATE) as days_until
FROM recurring_patterns rp
WHERE rp.is_active = TRUE
    AND rp.next_predicted_date >= CURRENT_DATE
    AND rp.next_predicted_date <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
ORDER BY rp.next_predicted_date ASC;

-- View: Minhas dívidas (o que devo)
CREATE OR REPLACE VIEW v_my_debts AS
SELECT 
    sp.id,
    bs.title,
    bs.owner_id,
    u.name as owner_name,
    sp.amount_owed,
    sp.amount_paid,
    sp.amount_owed - sp.amount_paid as remaining,
    sp.status,
    bs.split_date
FROM split_participants sp
JOIN bill_splits bs ON sp.split_id = bs.id
JOIN users u ON bs.owner_id = u.id
WHERE sp.user_id IS NOT NULL
    AND sp.status != 'paid'
ORDER BY bs.split_date DESC;

-- View: Créditos a receber (o que me devem)
CREATE OR REPLACE VIEW v_my_credits AS
SELECT 
    bs.id,
    bs.title,
    bs.total_amount,
    bs.split_date,
    COUNT(sp.id) as participants_count,
    SUM(sp.amount_owed) as total_owed,
    SUM(sp.amount_paid) as total_received,
    SUM(sp.amount_owed - sp.amount_paid) as remaining
FROM bill_splits bs
JOIN split_participants sp ON bs.id = sp.split_id
WHERE bs.owner_id IS NOT NULL
    AND bs.status != 'completed'
GROUP BY bs.id
HAVING remaining > 0
ORDER BY bs.split_date DESC;

-- ========== TRIGGERS ==========

DELIMITER //

-- Trigger: Atualizar status da divisão ao receber pagamento
CREATE TRIGGER after_split_payment
AFTER INSERT ON split_payments
FOR EACH ROW
BEGIN
    DECLARE participant_owed DECIMAL(10, 2);
    DECLARE participant_paid DECIMAL(10, 2);
    DECLARE split_total DECIMAL(10, 2);
    DECLARE split_received DECIMAL(10, 2);
    
    -- Atualizar participante
    UPDATE split_participants
    SET amount_paid = amount_paid + NEW.amount,
        status = CASE 
            WHEN amount_paid + NEW.amount >= amount_owed THEN 'paid'
            WHEN amount_paid + NEW.amount > 0 THEN 'partial'
            ELSE 'pending'
        END,
        paid_at = CASE 
            WHEN amount_paid + NEW.amount >= amount_owed THEN CURRENT_TIMESTAMP
            ELSE paid_at
        END
    WHERE id = NEW.participant_id;
    
    -- Verificar se split está completo
    SELECT 
        SUM(amount_owed) INTO split_total,
        SUM(amount_paid) INTO split_received
    FROM split_participants
    WHERE split_id = NEW.split_id;
    
    UPDATE bill_splits
    SET status = CASE 
        WHEN split_received >= split_total THEN 'completed'
        WHEN split_received > 0 THEN 'partially_paid'
        ELSE 'pending'
    END
    WHERE id = NEW.split_id;
END//

DELIMITER ;

-- ========== ÍNDICES ADICIONAIS ==========

CREATE INDEX IF NOT EXISTS idx_recurring_confidence ON recurring_patterns(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_splits_owner_status ON bill_splits(owner_id, status);

-- ========== ESTATÍSTICAS ==========

ANALYZE TABLE bill_splits;
ANALYZE TABLE split_participants;
ANALYZE TABLE split_payments;
ANALYZE TABLE recurring_patterns;
ANALYZE TABLE recurring_occurrences;
ANALYZE TABLE shared_expenses;
ANALYZE TABLE shared_expense_members;

COMMIT;

-- ========== NOTAS ==========

/*
FUNCIONALIDADES:

1. DIVISÃO DE CONTAS (Bill Splitting):
   - Dividir despesas entre amigos
   - Participantes internos (usuários) e externos
   - Rastreamento de pagamentos
   - Notificações automáticas

2. RECORRÊNCIAS INTELIGENTES:
   - Detecção automática de padrões
   - Machine Learning básico
   - Previsões de próximas despesas
   - Alertas antes do vencimento

3. DESPESAS COMPARTILHADAS:
   - Grupos de despesas
   - Divisão igual, percentual, ou custom
   - Ideal para casais, roommates

ALGORITMO DE DETECÇÃO:

1. Agrupar transações similares (mesma descrição/merchant)
2. Calcular intervalos entre ocorrências
3. Identificar padrão (mensal, semanal, etc)
4. Calcular confidence score baseado em:
   - Número de ocorrências (min 3)
   - Consistência do intervalo
   - Consistência do valor

Confidence Score:
- 0.90+ : Alta confiança (> 6 ocorrências consistentes)
- 0.70-0.89: Média confiança (3-5 ocorrências)
- < 0.70: Baixa confiança (padrão incerto)

QUERIES ÚTEIS:

-- Minhas divisões pendentes
SELECT * FROM v_pending_splits WHERE owner_id = ?;

-- O que me devem
SELECT * FROM v_my_credits WHERE owner_id = ?;

-- O que devo
SELECT * FROM v_my_debts WHERE user_id = ?;

-- Próximas recorrências
SELECT * FROM v_upcoming_recurring WHERE user_id = ?;
*/
