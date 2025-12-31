-- Migration: Investments & Loans System
-- Versão: 10.10.0
-- Sistema completo de investimentos e empréstimos

-- ========== INVESTMENTS (Expandir tabela existente) ==========

-- Adicionar colunas à tabela investments existente
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS invested_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_loss DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_loss_percent DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS broker VARCHAR(100),
ADD COLUMN IF NOT EXISTS ticker VARCHAR(20),
ADD COLUMN IF NOT EXISTS maturity_date DATE,
ADD COLUMN IF NOT EXISTS risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS liquidity ENUM('daily', 'monthly', 'maturity') DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS tax_regime ENUM('progressive', 'regressive', 'exempt') DEFAULT 'regressive',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ========== INVESTMENT TRANSACTIONS ==========

CREATE TABLE IF NOT EXISTS investment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    investment_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('buy', 'sell', 'dividend', 'interest', 'tax', 'fee') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    quantity DECIMAL(10, 4), -- Para ações/fundos
    price_per_unit DECIMAL(10, 2), -- Preço unitário
    transaction_date DATE NOT NULL,
    description VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_inv_trans_investment FOREIGN KEY (investment_id) 
        REFERENCES investments(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_trans_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    INDEX idx_inv_trans_investment (investment_id),
    INDEX idx_inv_trans_user (user_id),
    INDEX idx_inv_trans_date (transaction_date),
    INDEX idx_inv_trans_type (type)
);

-- ========== TAX CALCULATION (IR) ==========

CREATE TABLE IF NOT EXISTS investment_taxes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    investment_id INT NOT NULL,
    user_id INT NOT NULL,
    reference_year INT NOT NULL,
    reference_month INT NOT NULL,
    taxable_income DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'paid', 'exempt') NOT NULL DEFAULT 'pending',
    due_date DATE NOT NULL,
    paid_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_inv_tax_investment FOREIGN KEY (investment_id) 
        REFERENCES investments(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_tax_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    UNIQUE KEY uk_investment_period (investment_id, reference_year, reference_month),
    INDEX idx_inv_tax_user_year (user_id, reference_year),
    INDEX idx_inv_tax_status (status),
    INDEX idx_inv_tax_due_date (due_date)
);

-- ========== LOANS ==========

CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('personal', 'home', 'car', 'education', 'business', 'other') NOT NULL,
    principal_amount DECIMAL(10, 2) NOT NULL,
    outstanding_balance DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL, -- Taxa anual
    total_installments INT NOT NULL,
    paid_installments INT NOT NULL DEFAULT 0,
    installment_amount DECIMAL(10, 2) NOT NULL,
    amortization_type ENUM('price', 'sac', 'american') NOT NULL DEFAULT 'price',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'paid_off', 'defaulted') NOT NULL DEFAULT 'active',
    creditor VARCHAR(100), -- Credor/Banco
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_loans_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    INDEX idx_loans_user (user_id),
    INDEX idx_loans_user_status (user_id, status),
    INDEX idx_loans_type (type)
);

-- ========== LOAN PAYMENTS ==========

CREATE TABLE IF NOT EXISTS loan_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    user_id INT NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    principal_amount DECIMAL(10, 2) NOT NULL,
    interest_amount DECIMAL(10, 2) NOT NULL,
    outstanding_balance DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    paid_amount DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_loan_payments_loan FOREIGN KEY (loan_id) 
        REFERENCES loans(id) ON DELETE CASCADE,
    CONSTRAINT fk_loan_payments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    UNIQUE KEY uk_loan_installment (loan_id, installment_number),
    INDEX idx_loan_payments_loan (loan_id),
    INDEX idx_loan_payments_user_status (user_id, status),
    INDEX idx_loan_payments_due_date (due_date)
);

-- ========== VIEWS ÚTEIS ==========

-- View: Portfolio de investimentos
CREATE OR REPLACE VIEW v_investment_portfolio AS
SELECT 
    i.id,
    i.user_id,
    i.name,
    i.type,
    i.invested_amount,
    i.current_value,
    i.profit_loss,
    i.profit_loss_percent,
    i.risk_level,
    COALESCE(SUM(CASE WHEN it.type = 'dividend' THEN it.amount ELSE 0 END), 0) as total_dividends,
    COALESCE(SUM(CASE WHEN it.type = 'interest' THEN it.amount ELSE 0 END), 0) as total_interest,
    COALESCE(SUM(CASE WHEN it.type IN ('tax', 'fee') THEN it.amount ELSE 0 END), 0) as total_costs
FROM investments i
LEFT JOIN investment_transactions it ON i.id = it.investment_id
GROUP BY i.id;

-- View: Empréstimos ativos
CREATE OR REPLACE VIEW v_active_loans AS
SELECT 
    l.id,
    l.user_id,
    l.name,
    l.type,
    l.principal_amount,
    l.outstanding_balance,
    l.interest_rate,
    l.total_installments,
    l.paid_installments,
    l.installment_amount,
    l.amortization_type,
    l.end_date,
    COUNT(lp.id) as total_payments,
    SUM(CASE WHEN lp.status = 'paid' THEN lp.payment_amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN lp.status = 'overdue' THEN lp.payment_amount ELSE 0 END) as overdue_amount
FROM loans l
LEFT JOIN loan_payments lp ON l.id = lp.loan_id
WHERE l.status = 'active'
GROUP BY l.id;

-- View: Próximos pagamentos de empréstimo
CREATE OR REPLACE VIEW v_upcoming_loan_payments AS
SELECT 
    lp.id,
    lp.user_id,
    l.name as loan_name,
    lp.installment_number,
    l.total_installments,
    lp.due_date,
    lp.payment_amount,
    lp.status,
    DATEDIFF(lp.due_date, CURRENT_DATE) as days_until_due
FROM loan_payments lp
JOIN loans l ON lp.loan_id = l.id
WHERE lp.status = 'pending'
    AND lp.due_date >= CURRENT_DATE
ORDER BY lp.due_date ASC;

-- View: IR a pagar
CREATE OR REPLACE VIEW v_pending_investment_taxes AS
SELECT 
    it.id,
    it.user_id,
    i.name as investment_name,
    it.reference_year,
    it.reference_month,
    it.taxable_income,
    it.tax_rate,
    it.tax_amount,
    it.due_date,
    DATEDIFF(it.due_date, CURRENT_DATE) as days_until_due
FROM investment_taxes it
JOIN investments i ON it.investment_id = i.id
WHERE it.status = 'pending'
    AND it.due_date >= CURRENT_DATE
ORDER BY it.due_date ASC;

-- ========== TRIGGERS ==========

DELIMITER //

-- Trigger: Atualizar saldo do empréstimo ao pagar parcela
CREATE TRIGGER after_loan_payment_paid
AFTER UPDATE ON loan_payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE loans
        SET outstanding_balance = outstanding_balance - NEW.principal_amount,
            paid_installments = paid_installments + 1,
            status = CASE 
                WHEN paid_installments + 1 >= total_installments THEN 'paid_off'
                ELSE status
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.loan_id;
    END IF;
END//

-- Trigger: Recalcular lucro/prejuízo do investimento
CREATE TRIGGER after_investment_transaction
AFTER INSERT ON investment_transactions
FOR EACH ROW
BEGIN
    UPDATE investments
    SET current_value = current_value + 
        CASE 
            WHEN NEW.type IN ('buy', 'dividend', 'interest') THEN NEW.amount
            WHEN NEW.type IN ('sell', 'tax', 'fee') THEN -NEW.amount
            ELSE 0
        END,
        profit_loss = current_value - invested_amount,
        profit_loss_percent = ((current_value - invested_amount) / invested_amount) * 100,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.investment_id;
END//

DELIMITER ;

-- ========== ÍNDICES ADICIONAIS ==========

CREATE INDEX IF NOT EXISTS idx_investments_risk ON investments(risk_level);
CREATE INDEX IF NOT EXISTS idx_investments_maturity ON investments(maturity_date);
CREATE INDEX IF NOT EXISTS idx_loans_end_date ON loans(end_date);

-- ========== ESTATÍSTICAS ==========

ANALYZE TABLE investments;
ANALYZE TABLE investment_transactions;
ANALYZE TABLE investment_taxes;
ANALYZE TABLE loans;
ANALYZE TABLE loan_payments;

COMMIT;

-- ========== NOTAS ==========

/*
TABELA PRICE vs SAC:

PRICE (Sistema Francês):
- Parcelas FIXAS
- Mais juros no início
- Amortização crescente

SAC (Sistema de Amortização Constante):
- Parcelas DECRESCENTES
- Amortização fixa
- Menos juros no total

AMERICANO:
- Só juros mensais
- Principal no final

CÁLCULO IR INVESTIMENTOS:

Renda Fixa (Regressivo):
- Até 180 dias: 22.5%
- 181 a 360 dias: 20%
- 361 a 720 dias: 17.5%
- Acima de 720 dias: 15%

Ações (Progressivo):
- Day trade: 20%
- Swing trade: 15%
- Dividendos: Isento até R$ 20k/mês

QUERIES ÚTEIS:

-- Portfolio completo
SELECT * FROM v_investment_portfolio WHERE user_id = ?;

-- Empréstimos ativos
SELECT * FROM v_active_loans WHERE user_id = ?;

-- Próximos pagamentos
SELECT * FROM v_upcoming_loan_payments WHERE user_id = ? LIMIT 10;

-- IR a pagar
SELECT * FROM v_pending_investment_taxes WHERE user_id = ?;
*/
