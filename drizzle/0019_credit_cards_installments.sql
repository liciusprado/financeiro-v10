-- Migration: Credit Cards & Installments System
-- Versão: 10.9.0
-- Sistema completo de cartões de crédito e parcelamentos

-- ========== CREDIT CARDS ==========

CREATE TABLE IF NOT EXISTS credit_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    last_digits VARCHAR(4) NOT NULL,
    brand ENUM('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other') NOT NULL,
    credit_limit DECIMAL(10, 2) NOT NULL,
    available_limit DECIMAL(10, 2) NOT NULL,
    closing_day INT NOT NULL, -- Dia do fechamento (1-31)
    due_day INT NOT NULL, -- Dia do vencimento (1-31)
    is_active BOOLEAN DEFAULT TRUE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    icon VARCHAR(50) DEFAULT 'credit-card',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_credit_cards_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    INDEX idx_credit_cards_user (user_id),
    INDEX idx_credit_cards_active (user_id, is_active)
);

-- ========== CARD STATEMENTS (Faturas) ==========

CREATE TABLE IF NOT EXISTS card_statements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    reference_month DATE NOT NULL, -- YYYY-MM-01
    closing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status ENUM('open', 'closed', 'paid', 'overdue') NOT NULL DEFAULT 'open',
    paid_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_statements_card FOREIGN KEY (card_id) 
        REFERENCES credit_cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_statements_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    UNIQUE KEY uk_card_month (card_id, reference_month),
    INDEX idx_statements_card (card_id, reference_month),
    INDEX idx_statements_user_status (user_id, status),
    INDEX idx_statements_due_date (due_date)
);

-- ========== INSTALLMENTS (Parcelamentos) ==========

CREATE TABLE IF NOT EXISTS installments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_id INT, -- Transação original (pode ser NULL para parcelamentos externos)
    card_id INT, -- Cartão usado (NULL se não for cartão)
    description VARCHAR(200) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    total_installments INT NOT NULL,
    current_installment INT NOT NULL DEFAULT 0,
    installment_amount DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    category VARCHAR(100),
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_installments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_installments_transaction FOREIGN KEY (transaction_id) 
        REFERENCES transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_installments_card FOREIGN KEY (card_id) 
        REFERENCES credit_cards(id) ON DELETE SET NULL,
        
    INDEX idx_installments_user (user_id),
    INDEX idx_installments_user_status (user_id, status),
    INDEX idx_installments_card (card_id),
    INDEX idx_installments_transaction (transaction_id)
);

-- ========== INSTALLMENT PAYMENTS (Parcelas individuais) ==========

CREATE TABLE IF NOT EXISTS installment_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    installment_id INT NOT NULL,
    user_id INT NOT NULL,
    statement_id INT, -- Fatura associada (se cartão)
    installment_number INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_installment_payments_installment FOREIGN KEY (installment_id) 
        REFERENCES installments(id) ON DELETE CASCADE,
    CONSTRAINT fk_installment_payments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_installment_payments_statement FOREIGN KEY (statement_id) 
        REFERENCES card_statements(id) ON DELETE SET NULL,
        
    UNIQUE KEY uk_installment_number (installment_id, installment_number),
    INDEX idx_payment_installment (installment_id),
    INDEX idx_payment_user_status (user_id, status),
    INDEX idx_payment_due_date (due_date),
    INDEX idx_payment_statement (statement_id)
);

-- ========== CARD TRANSACTIONS ==========

-- Adicionar coluna para associar transações a cartões
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS card_id INT NULL,
ADD COLUMN IF NOT EXISTS installment_id INT NULL,
ADD COLUMN IF NOT EXISTS statement_id INT NULL,
ADD CONSTRAINT fk_transactions_card 
    FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_transactions_installment 
    FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_transactions_statement 
    FOREIGN KEY (statement_id) REFERENCES card_statements(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_card ON transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment ON transactions(installment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON transactions(statement_id);

-- ========== VIEWS ÚTEIS ==========

-- View: Limite disponível por cartão
CREATE OR REPLACE VIEW v_card_available_limit AS
SELECT 
    cc.id AS card_id,
    cc.user_id,
    cc.name AS card_name,
    cc.credit_limit,
    cc.credit_limit - COALESCE(SUM(
        CASE 
            WHEN cs.status IN ('open', 'closed') 
            THEN cs.total_amount - cs.paid_amount
            ELSE 0
        END
    ), 0) AS available_limit,
    COALESCE(SUM(
        CASE 
            WHEN cs.status IN ('open', 'closed') 
            THEN cs.total_amount - cs.paid_amount
            ELSE 0
        END
    ), 0) AS used_amount
FROM credit_cards cc
LEFT JOIN card_statements cs ON cc.id = cs.card_id
WHERE cc.is_active = TRUE
GROUP BY cc.id, cc.user_id, cc.name, cc.credit_limit;

-- View: Próximas faturas a vencer
CREATE OR REPLACE VIEW v_upcoming_statements AS
SELECT 
    cs.id,
    cs.user_id,
    cc.name AS card_name,
    cs.reference_month,
    cs.due_date,
    cs.total_amount,
    cs.paid_amount,
    cs.total_amount - cs.paid_amount AS remaining_amount,
    cs.status,
    DATEDIFF(cs.due_date, CURRENT_DATE) AS days_until_due
FROM card_statements cs
JOIN credit_cards cc ON cs.card_id = cc.id
WHERE cs.status IN ('closed', 'open')
    AND cs.due_date >= CURRENT_DATE
ORDER BY cs.due_date ASC;

-- View: Parcelamentos ativos
CREATE OR REPLACE VIEW v_active_installments AS
SELECT 
    i.id,
    i.user_id,
    i.description,
    i.total_amount,
    i.total_installments,
    i.current_installment,
    i.installment_amount,
    cc.name AS card_name,
    COUNT(ip.id) AS paid_installments,
    i.total_installments - COUNT(ip.id) AS remaining_installments,
    COUNT(ip.id) * i.installment_amount AS paid_amount,
    (i.total_installments - COUNT(ip.id)) * i.installment_amount AS remaining_amount
FROM installments i
LEFT JOIN credit_cards cc ON i.card_id = cc.id
LEFT JOIN installment_payments ip ON i.id = ip.installment_id AND ip.status = 'paid'
WHERE i.status = 'active'
GROUP BY i.id;

-- View: Próximas parcelas a vencer
CREATE OR REPLACE VIEW v_upcoming_installment_payments AS
SELECT 
    ip.id,
    ip.user_id,
    i.description,
    ip.installment_number,
    i.total_installments,
    ip.amount,
    ip.due_date,
    ip.status,
    cc.name AS card_name,
    DATEDIFF(ip.due_date, CURRENT_DATE) AS days_until_due
FROM installment_payments ip
JOIN installments i ON ip.installment_id = i.id
LEFT JOIN credit_cards cc ON i.card_id = cc.id
WHERE ip.status = 'pending'
    AND ip.due_date >= CURRENT_DATE
ORDER BY ip.due_date ASC;

-- ========== TRIGGERS ==========

-- Trigger: Atualizar limite disponível ao criar/atualizar fatura
DELIMITER //

CREATE TRIGGER after_statement_insert 
AFTER INSERT ON card_statements
FOR EACH ROW
BEGIN
    UPDATE credit_cards 
    SET available_limit = credit_limit - (
        SELECT COALESCE(SUM(total_amount - paid_amount), 0)
        FROM card_statements
        WHERE card_id = NEW.card_id AND status IN ('open', 'closed')
    )
    WHERE id = NEW.card_id;
END//

CREATE TRIGGER after_statement_update 
AFTER UPDATE ON card_statements
FOR EACH ROW
BEGIN
    UPDATE credit_cards 
    SET available_limit = credit_limit - (
        SELECT COALESCE(SUM(total_amount - paid_amount), 0)
        FROM card_statements
        WHERE card_id = NEW.card_id AND status IN ('open', 'closed')
    )
    WHERE id = NEW.card_id;
END//

-- Trigger: Atualizar status de parcelamento quando todas parcelas pagas
CREATE TRIGGER after_payment_update
AFTER UPDATE ON installment_payments
FOR EACH ROW
BEGIN
    DECLARE total_installments INT;
    DECLARE paid_installments INT;
    
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        SELECT total_installments INTO total_installments
        FROM installments WHERE id = NEW.installment_id;
        
        SELECT COUNT(*) INTO paid_installments
        FROM installment_payments
        WHERE installment_id = NEW.installment_id AND status = 'paid';
        
        IF paid_installments >= total_installments THEN
            UPDATE installments
            SET status = 'completed', current_installment = total_installments
            WHERE id = NEW.installment_id;
        ELSE
            UPDATE installments
            SET current_installment = paid_installments
            WHERE id = NEW.installment_id;
        END IF;
    END IF;
END//

DELIMITER ;

-- ========== DADOS INICIAIS ==========

-- Nada aqui, será criado pelo usuário

COMMIT;

-- ========== ESTATÍSTICAS ==========

ANALYZE TABLE credit_cards;
ANALYZE TABLE card_statements;
ANALYZE TABLE installments;
ANALYZE TABLE installment_payments;

-- ========== NOTAS ==========

/*
FUNCIONALIDADES:

1. CARTÕES DE CRÉDITO:
   - Múltiplos cartões por usuário
   - Limite de crédito
   - Limite disponível (calculado automaticamente)
   - Dia de fechamento e vencimento
   - Cores e ícones customizáveis

2. FATURAS:
   - Geração automática mensal
   - Status: open, closed, paid, overdue
   - Associação com transações
   - Histórico de pagamentos

3. PARCELAMENTOS:
   - Compras parceladas
   - Cartão ou boleto
   - Acompanhamento de parcelas
   - Cálculo automático de juros (opcional)

4. PARCELAS INDIVIDUAIS:
   - Uma entrada por parcela
   - Status individual (pending, paid, overdue)
   - Associação com fatura (se cartão)
   - Data de vencimento

QUERIES ÚTEIS:

-- Listar cartões com limite disponível
SELECT * FROM v_card_available_limit WHERE user_id = ?;

-- Próximas faturas a vencer
SELECT * FROM v_upcoming_statements WHERE user_id = ? LIMIT 5;

-- Parcelamentos ativos
SELECT * FROM v_active_installments WHERE user_id = ?;

-- Próximas parcelas a vencer
SELECT * FROM v_upcoming_installment_payments WHERE user_id = ? LIMIT 10;
*/
