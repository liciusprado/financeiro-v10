-- Migration: Multi-Currency System
-- Created: 2025-12-28
-- Description: Sistema completo de múltiplas moedas com conversão e histórico

CREATE TABLE IF NOT EXISTS currencies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(3) NOT NULL UNIQUE, -- USD, EUR, BRL, etc
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_code (code),
  INDEX idx_isActive (isActive)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fromCurrency VARCHAR(3) NOT NULL,
  toCurrency VARCHAR(3) NOT NULL,
  rate DECIMAL(20, 10) NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(50) DEFAULT 'api', -- 'api', 'manual'
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_rate (fromCurrency, toCurrency, date),
  INDEX idx_currencies (fromCurrency, toCurrency),
  INDEX idx_date (date)
);

CREATE TABLE IF NOT EXISTS user_currency_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  baseCurrency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  displayCurrencies JSON, -- Array de moedas para exibir
  autoConvert BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Adicionar colunas de moeda nas tabelas existentes
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';
ALTER TABLE investments ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';

-- Inserir moedas principais
INSERT IGNORE INTO currencies (code, name, symbol) VALUES
('BRL', 'Real Brasileiro', 'R$'),
('USD', 'Dólar Americano', '$'),
('EUR', 'Euro', '€'),
('GBP', 'Libra Esterlina', '£'),
('JPY', 'Iene Japonês', '¥'),
('CAD', 'Dólar Canadense', 'C$'),
('AUD', 'Dólar Australiano', 'A$'),
('CHF', 'Franco Suíço', 'CHF'),
('CNY', 'Yuan Chinês', '¥'),
('MXN', 'Peso Mexicano', '$'),
('ARS', 'Peso Argentino', '$'),
('CLP', 'Peso Chileno', '$');
