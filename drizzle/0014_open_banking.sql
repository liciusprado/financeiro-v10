-- Migration: Open Banking Integration (Belvo)
-- Versão: 10.3.0

-- ========== TABELA: bank_connections ==========
-- Conexões com instituições bancárias via Belvo
CREATE TABLE IF NOT EXISTS bank_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  belvo_link_id VARCHAR(255) NOT NULL UNIQUE,
  institution_name VARCHAR(100) NOT NULL,
  institution_code VARCHAR(50) NOT NULL,
  status ENUM('active', 'invalid', 'error', 'pending') NOT NULL DEFAULT 'active',
  last_sync TIMESTAMP NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_last_sync (last_sync)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABELA: bank_accounts ==========
-- Contas bancárias importadas do Belvo
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  connection_id INT NOT NULL,
  belvo_account_id VARCHAR(255) NOT NULL UNIQUE,
  account_number VARCHAR(50),
  account_type VARCHAR(50),
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  INDEX idx_connection (connection_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABELA: imported_bank_transactions ==========
-- Transações importadas do banco (raw)
CREATE TABLE IF NOT EXISTS imported_bank_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  connection_id INT NOT NULL,
  account_id INT,
  belvo_transaction_id VARCHAR(255) NOT NULL UNIQUE,
  date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT NOT NULL,
  transaction_type VARCHAR(50),
  bank_category VARCHAR(100),
  merchant VARCHAR(100),
  is_imported BOOLEAN DEFAULT FALSE,
  imported_entry_id INT NULL,
  import_status ENUM('pending', 'imported', 'ignored', 'error') DEFAULT 'pending',
  suggested_category VARCHAR(100),
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  INDEX idx_connection (connection_id),
  INDEX idx_account (account_id),
  INDEX idx_date (date),
  INDEX idx_status (import_status),
  INDEX idx_is_imported (is_imported)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABELA: bank_sync_logs ==========
-- Histórico de sincronizações
CREATE TABLE IF NOT EXISTS bank_sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  connection_id INT NOT NULL,
  sync_type ENUM('manual', 'automatic', 'scheduled') NOT NULL,
  status ENUM('success', 'partial', 'error') NOT NULL,
  transactions_fetched INT NOT NULL DEFAULT 0,
  transactions_imported INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  INDEX idx_connection (connection_id),
  INDEX idx_status (status),
  INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== TABELA: bank_sync_schedule ==========
-- Agendamento de sincronizações automáticas
CREATE TABLE IF NOT EXISTS bank_sync_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  connection_id INT NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'daily',
  time TIME NOT NULL DEFAULT '08:00:00',
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP NULL,
  next_run TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  UNIQUE KEY unique_connection_schedule (connection_id),
  INDEX idx_active_next (is_active, next_run)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
