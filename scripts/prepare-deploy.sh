#!/bin/bash

# Script de Deploy - GitHub Upload
# Este script prepara e sobe seu código no GitHub

echo "🚀 PREPARANDO CÓDIGO PARA DEPLOY..."
echo ""

# 1. Criar .gitignore se não existir
if [ ! -f .gitignore ]; then
    echo "📝 Criando .gitignore..."
    cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.production

# Build
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# Uploads e temporários
uploads/
temp/
backups/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.sql.backup

# Status files
.setup-status.json
GITIGNORE
    echo "✅ .gitignore criado!"
fi

# 2. Inicializar Git se necessário
if [ ! -d .git ]; then
    echo "📦 Inicializando Git..."
    git init
    git add .
    git commit -m "🎉 Initial commit - Sistema Financeiro v10.12"
    echo "✅ Git inicializado!"
else
    echo "✅ Git já está inicializado!"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "          ✅ CÓDIGO PREPARADO PARA GITHUB!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Vá para: https://github.com/new"
echo ""
echo "2. Preencha:"
echo "   • Repository name: financeiro-v10"
echo "   • Description: Sistema Financeiro Completo v10.12"
echo "   • Deixe PUBLIC (ou Private se preferir)"
echo "   • NÃO marque 'Add README'"
echo "   • Clique em 'Create repository'"
echo ""
echo "3. Na página que abrir, COPIE o comando que aparece em:"
echo "   '...or push an existing repository from the command line'"
echo ""
echo "   Será algo como:"
echo "   git remote add origin https://github.com/SEU-USUARIO/financeiro-v10.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. COLE os 3 comandos aqui no terminal e aperte ENTER"
echo ""
echo "5. Digite seu username do GitHub"
echo "6. Digite sua senha (ou token se tiver 2FA)"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "💡 DICA: Estou esperando você fazer isso..."
echo "   Quando terminar, volte aqui e aperte ENTER!"
echo ""
read -p "👉 Pressione ENTER quando tiver feito o upload para o GitHub..."

echo ""
echo "🎉 PERFEITO! Agora vamos para o RAILWAY!"
echo ""
