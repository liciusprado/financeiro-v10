#!/usr/bin/env node
/**
 * Setup Script
 * Configuração automática inicial do sistema
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🚀 INICIANDO SETUP DO SISTEMA v10.12...\n');

// ========== 1. VERIFICAR .ENV ==========
console.log('📋 [1/5] Verificando arquivo .env...');

const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('   ⚠️  Arquivo .env não encontrado');
  console.log('   📝 Copiando .env.example para .env...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✅ Arquivo .env criado!\n');
    console.log('   ⚠️  IMPORTANTE: Configure as variáveis no .env antes de continuar!\n');
  } else {
    console.error('   ❌ Erro: .env.example não encontrado!');
    process.exit(1);
  }
} else {
  console.log('   ✅ Arquivo .env já existe!\n');
}

// ========== 2. CRIAR DIRETÓRIOS ==========
console.log('📁 [2/5] Criando diretórios necessários...');

const dirs = [
  'uploads',
  'backups',
  'logs',
  'temp',
  'public/exports',
];

dirs.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`   ✅ Criado: ${dir}`);
  } else {
    console.log(`   ⏭️  Já existe: ${dir}`);
  }
});

console.log('');

// ========== 3. VERIFICAR DATABASE ==========
console.log('🗄️  [3/5] Verificando conexão com banco de dados...');

try {
  // Ler .env
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const dbName = envContent.match(/DB_NAME="?([^"\n]+)"?/)?.[1] || 'financeiro_v10';
  const dbUser = envContent.match(/DB_USER="?([^"\n]+)"?/)?.[1] || 'root';
  const dbPassword = envContent.match(/DB_PASSWORD="?([^"\n]+)"?/)?.[1] || '';
  
  console.log(`   📊 Database: ${dbName}`);
  console.log(`   👤 User: ${dbUser}`);
  
  // Tentar criar database se não existir
  try {
    const createDbCmd = `mysql -u ${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} -e "CREATE DATABASE IF NOT EXISTS ${dbName};"`;
    execSync(createDbCmd, { stdio: 'pipe' });
    console.log('   ✅ Database verificado/criado!\n');
  } catch (err) {
    console.log('   ⚠️  Não foi possível criar database automaticamente');
    console.log('   💡 Execute manualmente:');
    console.log(`      mysql -u ${dbUser} -p`);
    console.log(`      mysql> CREATE DATABASE ${dbName};`);
    console.log(`      mysql> exit;\n`);
  }
} catch (err) {
  console.log('   ⚠️  Erro ao ler configurações do .env');
  console.log('   💡 Verifique se o .env está configurado corretamente\n');
}

// ========== 4. VERIFICAR REDIS ==========
console.log('🔴 [4/5] Verificando Redis (opcional)...');

try {
  execSync('redis-cli ping', { stdio: 'pipe' });
  console.log('   ✅ Redis está rodando!\n');
} catch (err) {
  console.log('   ⚠️  Redis não está rodando (opcional)');
  console.log('   💡 Para melhor performance, instale e inicie o Redis:');
  console.log('      Ubuntu/Debian: sudo apt-get install redis-server');
  console.log('      MacOS: brew install redis');
  console.log('      Windows: https://redis.io/docs/getting-started/installation/install-redis-on-windows/\n');
}

// ========== 5. CRIAR ARQUIVO DE CONFIGURAÇÃO ==========
console.log('⚙️  [5/5] Criando arquivo de status...');

const statusPath = path.join(rootDir, '.setup-status.json');
const status = {
  version: '10.12.0',
  setupDate: new Date().toISOString(),
  envConfigured: fs.existsSync(envPath),
  directoriesCreated: true,
};

fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
console.log('   ✅ Status salvo!\n');

// ========== SUMÁRIO FINAL ==========
console.log('═══════════════════════════════════════════════════════');
console.log('                    ✅ SETUP COMPLETO!');
console.log('═══════════════════════════════════════════════════════\n');

console.log('📋 PRÓXIMOS PASSOS:\n');
console.log('1. Configure o arquivo .env com suas credenciais');
console.log('   $ nano .env\n');

console.log('2. Rode as migrations do banco de dados:');
console.log('   $ npm run db:migrate\n');

console.log('3. (Opcional) Popule o banco com dados de exemplo:');
console.log('   $ npm run db:seed\n');

console.log('4. Inicie o servidor de desenvolvimento:');
console.log('   $ npm run dev\n');

console.log('5. Acesse: http://localhost:3000\n');

console.log('═══════════════════════════════════════════════════════');
console.log('                  🎉 BOM DESENVOLVIMENTO!');
console.log('═══════════════════════════════════════════════════════\n');

console.log('💡 DICA: Execute "npm run db:migrate" para aplicar todas as migrations!\n');
