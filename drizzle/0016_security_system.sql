-- Migration: Security System
-- Versão: 10.6.0
-- 2FA, Audit Logs, Session Management, Security Alerts

-- ========== TABELA: two_factor_auth ==========
-- Configuração de 2FA por usuário
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT FALSE,
  secret VARCHAR(255) NOT NULL,
  backup_codes JSON,
  method ENUM('totp', 'sms', 'email') DEFAULT 'totp',
  phone_number VARCHAR(20),
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: audit_logs ==========
-- Registro de todas ações importantes
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status ENUM('success', 'failed', 'warning') DEFAULT 'success',
  error_message TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: user_sessions ==========
-- Controle de sessões ativas
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255),
  device_name VARCHAR(100),
  device_type ENUM('desktop', 'mobile', 'tablet', 'other') DEFAULT 'other',
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(45),
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_token (session_token),
  INDEX idx_active (is_active),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: security_alerts ==========
-- Alertas de segurança para o usuário
CREATE TABLE IF NOT EXISTS security_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  alert_type ENUM(
    'new_login',
    'password_changed',
    '2fa_enabled',
    '2fa_disabled',
    'suspicious_activity',
    'failed_login_attempts',
    'session_expired',
    'data_export',
    'account_deletion'
  ) NOT NULL,
  severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  location VARCHAR(255),
  device_info TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  action_required BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  dismissed_at TIMESTAMP NULL,
  INDEX idx_user (user_id),
  INDEX idx_type (alert_type),
  INDEX idx_severity (severity),
  INDEX idx_read (is_read),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: login_attempts ==========
-- Rastreamento de tentativas de login (falhas e sucessos)
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_email (email),
  INDEX idx_ip (ip_address),
  INDEX idx_success (success),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: password_history ==========
-- Histórico de senhas (hash) para evitar reutilização
CREATE TABLE IF NOT EXISTS password_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: security_settings ==========
-- Configurações de segurança por usuário
CREATE TABLE IF NOT EXISTS security_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  require_2fa BOOLEAN DEFAULT FALSE,
  session_timeout_minutes INT DEFAULT 60,
  max_sessions INT DEFAULT 5,
  notify_new_login BOOLEAN DEFAULT TRUE,
  notify_password_change BOOLEAN DEFAULT TRUE,
  notify_2fa_change BOOLEAN DEFAULT TRUE,
  notify_suspicious_activity BOOLEAN DEFAULT TRUE,
  allowed_ip_addresses JSON,
  blocked_ip_addresses JSON,
  require_password_change_days INT DEFAULT 90,
  last_password_change TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== TABELA: trusted_devices ==========
-- Dispositivos confiáveis (para pular 2FA)
CREATE TABLE IF NOT EXISTS trusted_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(100),
  device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address VARCHAR(45),
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trusted_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_device (user_id, device_fingerprint),
  INDEX idx_user (user_id),
  INDEX idx_fingerprint (device_fingerprint),
  INDEX idx_trusted_until (trusted_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== Views úteis ==========

-- View: Sessões ativas por usuário
CREATE OR REPLACE VIEW active_sessions_summary AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  MAX(last_activity) as last_activity,
  GROUP_CONCAT(DISTINCT device_type) as device_types
FROM user_sessions
WHERE is_active = TRUE AND expires_at > NOW()
GROUP BY user_id;

-- View: Alertas não lidos por usuário
CREATE OR REPLACE VIEW unread_alerts_summary AS
SELECT 
  user_id,
  COUNT(*) as total_unread,
  SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
  SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning_count,
  MAX(created_at) as latest_alert
FROM security_alerts
WHERE is_read = FALSE AND is_dismissed = FALSE
GROUP BY user_id;

-- View: Tentativas de login falhadas recentes
CREATE OR REPLACE VIEW recent_failed_logins AS
SELECT 
  email,
  ip_address,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempt,
  location
FROM login_attempts
WHERE success = FALSE 
  AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY email, ip_address, location
HAVING attempt_count >= 3;

COMMIT;
