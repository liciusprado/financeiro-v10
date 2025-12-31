#!/usr/bin/env node
/**
 * Database Migration Script
 * Aplica todas as migrations na ordem correta
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Carregar .env
dotenv.config({ path: path.join(rootDir, '.env') });

console.log('🗄️  INICIANDO MIGRATIONS...\n');

async function runMigrations() {
  // Criar conexão
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'financeiro_v10',
    multipleStatements: true,
  });

  console.log('✅ Conectado ao banco de dados\n');

  // Criar tabela de migrations se não existir
  await connection.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Buscar migrations aplicadas
  const [appliedMigrations] = await connection.query(
    'SELECT filename FROM migrations'
  );

  const appliedFilenames = new Set(
    appliedMigrations.map((m) => m.filename)
  );

  // Listar arquivos de migration
  const migrationsDir = path.join(rootDir, 'drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📁 Encontradas ${files.length} migrations\n`);

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    if (appliedFilenames.has(file)) {
      console.log(`⏭️  ${file} - JÁ APLICADA`);
      skipped++;
      continue;
    }

    console.log(`🔄 Aplicando ${file}...`);

    try {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      // Executar migration
      await connection.query(sql);

      // Registrar migration
      await connection.query(
        'INSERT INTO migrations (filename) VALUES (?)',
        [file]
      );

      console.log(`✅ ${file} - SUCESSO\n`);
      applied++;
    } catch (err) {
      console.error(`❌ ${file} - ERRO:`);
      console.error(err.message);
      console.error('\n❌ Migrations interrompidas!\n');
      await connection.end();
      process.exit(1);
    }
  }

  await connection.end();

  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ MIGRATIONS CONCLUÍDAS!`);
  console.log(`   • Aplicadas: ${applied}`);
  console.log(`   • Puladas: ${skipped}`);
  console.log(`   • Total: ${files.length}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

// Executar
runMigrations().catch(err => {
  console.error('❌ ERRO FATAL:', err);
  process.exit(1);
});
