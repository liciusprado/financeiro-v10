# Project TODO

## Funcionalidades Principais

### Estrutura de Dados
- [x] Criar schema de banco de dados para categorias
- [x] Criar schema de banco de dados para itens financeiros
- [x] Criar schema de banco de dados para lançamentos mensais

### Backend (tRPC Procedures)
- [x] Procedure para listar categorias
- [x] Procedure para criar/editar/excluir categorias
- [x] Procedure para listar itens por categoria
- [x] Procedure para criar/editar/excluir itens
- [x] Procedure para listar lançamentos do mês
- [x] Procedure para criar/editar/excluir lançamentos
- [x] Procedure para obter resumo financeiro (totais, saldo)
- [x] Procedure para alternar entre meses

### Interface do Usuário
- [x] Dashboard principal com resumo financeiro
- [x] Visualização de categorias (Entradas, Alunos, Investimentos, Fixo, Variável)
- [x] Formulário para adicionar/editar lançamentos
- [x] Tabela de lançamentos com filtros por categoria
- [x] Indicadores visuais de meta vs real
- [x] Cálculo automático de totais por pessoa e casal
- [x] Seletor de mês/ano
- [ ] Gráficos de acompanhamento (opcional)

### Testes
- [x] Testes unitários para procedures principais
- [x] Validação de cálculos de totais

### Documentação
- [x] Instruções de uso no README

## Novas Funcionalidades

### Gerenciamento de Itens
- [x] Adicionar botão para criar novo item em cada categoria
- [x] Implementar formulário de criação de item
- [x] Adicionar botão de excluir item
- [x] Implementar confirmação de exclusão
- [x] Adicionar campo de categoria customizável nos itens

### Gráficos e Visualizações
- [x] Implementar gráfico de evolução de receitas mensais
- [x] Implementar gráfico de evolução de despesas mensais
- [x] Implementar gráfico de evolução de saldo mensal
- [x] Adicionar seletor de período para gráficos
- [x] Criar página dedicada para visualizações

### Exportação de Relatórios
- [x] Implementar exportação para PDF
- [x] Implementar exportação para Excel
- [x] Adicionar seletor de período para exportação
- [ ] Incluir gráficos nos relatórios exportados

### Alertas de Orçamento
- [x] Criar sistema de verificação de metas ultrapassadas
- [x] Implementar notificações visuais no dashboard
- [x] Adicionar badge de alerta nas categorias
- [ ] Criar página de configuração de alertas

## Funcionalidades Adicionais

### Filtros e Busca
- [x] Adicionar campo de busca global no dashboard
- [x] Implementar filtro por categoria customizada
- [x] Adicionar filtro por tipo (receita/despesa/investimento)
- [x] Destacar resultados da busca nas tabelas

### Metas Anuais
- [x] Criar página de visualização anual
- [x] Implementar gráfico de progresso anual
- [x] Adicionar comparativo ano a ano
- [x] Calcular e exibir projeções baseadas em médias mensais
- [x] Mostrar percentual de conclusão das metas anuais

### Modo de Planejamento
- [x] Adicionar botão "Duplicar Mês" no dashboard
- [x] Implementar procedure para copiar lançamentos
- [x] Criar dialog de confirmação com seleção de mês destino
- [x] Permitir duplicar apenas valores planejados ou reais também

### Design e UX
- [x] Adicionar plano de fundo temático financeiro
- [x] Melhorar gradientes e cores do tema
- [x] Adicionar padrões sutis de fundo

## Funcionalidades Avançadas

### Upload de Anexos
- [x] Adicionar campo de anexos no schema de entries
- [x] Implementar upload de arquivos para S3
- [x] Adicionar botão de upload em cada lançamento
- [x] Exibir lista de anexos com preview
- [x] Permitir download e exclusão de anexos
- [x] Suportar imagens (JPG, PNG) e PDFs

### Gráfico de Pizza
- [x] Criar componente de gráfico de pizza
- [x] Calcular distribuição percentual por categoria
- [x] Adicionar ao dashboard principal
- [x] Mostrar legenda com valores e percentuais
- [x] Cores distintas para cada categoria

### Categorias Personalizadas
- [ ] Adicionar CRUD de categorias principais
- [ ] Permitir usuário criar novas categorias
- [ ] Implementar edição e exclusão de categorias
- [ ] Validar antes de excluir (verificar se tem itens)
- [ ] Interface de gerenciamento de categorias

### Histórico de Alterações
- [x] Criar tabela de audit log no schema
- [ ] Registrar todas as alterações de entries
- [ ] Capturar usuário, data/hora e valores anteriores
- [ ] Criar página de visualização de histórico
- [ ] Filtrar histórico por item ou período

### Dashboard Comparativo
- [ ] Criar procedure para comparação mensal
- [ ] Gráfico comparando últimos 3-6 meses
- [ ] Destacar variações significativas (>10%)
- [ ] Cards mostrando tendências (↑↓)
- [ ] Análise de crescimento/redução

### Design Vibrante
- [x] Atualizar paleta de cores para tons vibrantes
- [x] Aumentar saturação das cores primárias
- [x] Melhorar contraste dos cards
- [x] Adicionar gradientes coloridos
- [x] Atualizar cores dos gráficos

## Correções Urgentes

### Cor de Fundo
- [x] Alterar cor de fundo de branco para tom escuro vibrante
- [x] Aplicar gradiente colorido no fundo
- [x] Garantir contraste adequado com texto
- [x] Testar legibilidade em todas as seções

### Upload em Todas as Linhas
- [x] Modificar lógica para criar entry automaticamente se não existir
- [x] Adicionar botão de upload mesmo sem lançamento prévio
- [x] Garantir que todas as linhas tenham acesso ao upload
- [x] Atualizar interface para mostrar upload disponível

### Histórico Automático (Implementação Completa)
- [x] Adicionar trigger em upsertEntry para registrar mudanças
- [x] Capturar valores antigos antes de atualizar
- [x] Registrar usuário, timestamp e campos alterados
- [ ] Criar página de visualização de histórico
- [ ] Adicionar filtros por item e período

### Dashboard Comparativo
- [x] Criar procedure getComparativeData
- [x] Gráfico de barras comparando últimos 3-6 meses
- [x] Calcular variações percentuais
- [x] Destacar variações > 10% com cores
- [x] Cards com indicadores de tendência (↑↓)
- [x] Adicionar ao dashboard principal

### Gerenciamento de Categorias
- [ ] Página de gerenciamento de categorias
- [ ] CRUD completo: criar, editar, excluir
- [ ] Validar exclusão (verificar itens vinculados)
- [ ] Permitir reordenar categorias
- [ ] Escolher cores personalizadas
- [ ] Link no menu principal

## Novas Funcionalidades Solicitadas

### Página de Histórico
- [x] Criar página /historico para visualização de auditoria
- [x] Listar todas as alterações com usuário, data/hora e valores
- [x] Filtrar por item específico
- [x] Filtrar por período (data início e fim)
- [x] Mostrar campo alterado, valor antigo e valor novo
- [x] Paginação para grandes volumes de dados

### Exportação de Histórico
- [ ] Botão para exportar histórico em PDF
- [x] Botão para exportar histórico em CSV
- [ ] Incluir filtros aplicados na exportação
- [ ] Formatação adequada para impressão (PDF)
- [x] Colunas organizadas no CSV

### Gerenciamento de Categorias
- [ ] Criar página /categorias para administração
- [ ] Listar todas as categorias existentes
- [ ] Formulário para criar nova categoria
- [ ] Formulário para editar categoria existente
- [ ] Botão para excluir categoria
- [ ] Validar se categoria tem itens antes de excluir
- [ ] Mostrar contagem de itens por categoria
- [ ] Permitir reordenar categorias (drag and drop)

### Notificações WhatsApp
- [ ] Integrar API do Manus para notificações
- [ ] Configurar números: 5562985051201 e 5562985908516
- [ ] Detectar quando gasto ultrapassa meta em 20%
- [ ] Enviar mensagem via WhatsApp com detalhes
- [ ] Incluir categoria, valor planejado, valor real e diferença
- [ ] Enviar apenas uma vez por categoria por mês
- [ ] Página de configuração de notificações

### Ajustes de Cores
- [x] Alterar cor do contorno da aba "Investimentos" para verde
- [x] Alterar cor da fonte dos campos de "Investimentos" para verde
- [x] Alterar cor da aba "Entradas" para azul
- [x] Alterar cor da aba "Alunos de Personal" para azul
- [x] Garantir contraste adequado com fundo escuro

## Correções e Novas Funcionalidades

### Correções de Cores nos Cards Superiores
- [x] Alterar cor do card "Receitas" de verde para azul
- [x] Alterar cor do card "Investimentos" de azul para verde
- [x] Alterar cor do card "Saldo" de verde para amarelo/alaranjado
- [x] Manter cor vermelha do card "Despesas"

### Correções de Cores nos Campos de Investimentos
- [x] Alterar cor do texto dos itens de investimento de branco para verde
- [x] Aplicar cor verde em todos os campos da seção de investimentos
- [x] Garantir legibilidade com fundo escuro

### Gerenciamento de Categorias (CRUD Completo)
- [ ] Criar página /categorias para administração
- [ ] Listar todas as categorias com contagem de itens
- [ ] Formulário para criar nova categoria (nome, tipo, cor)
- [ ] Formulário para editar categoria existente
- [ ] Botão para excluir categoria com confirmação
- [ ] Validar se categoria tem itens antes de excluir
- [ ] Implementar reordenação drag-and-drop
- [ ] Adicionar link no menu principal

### Notificações WhatsApp
- [ ] Integrar com sistema de notificações do Manus
- [ ] Configurar números: 5562985051201 e 5562985908516
- [ ] Detectar quando gasto ultrapassa meta em 20%
- [ ] Enviar mensagem via WhatsApp com detalhes
- [ ] Incluir: categoria, item, valor planejado, valor real, diferença
- [ ] Enviar apenas uma vez por item por mês
- [ ] Marcar notificação como enviada no banco

### Exportação PDF do Histórico
- [ ] Implementar geração de PDF com biblioteca
- [ ] Adicionar logo e cabeçalho profissional
- [ ] Formatar tabela de histórico para impressão
- [ ] Incluir filtros aplicados no relatório
- [ ] Adicionar rodapé com data de geração
- [ ] Layout responsivo para A4

## Implementação de Notificações WhatsApp

### Schema e Banco de Dados
- [x] Criar tabela notificationsSent para rastrear notificações enviadas
- [x] Adicionar campos: itemId, month, year, sentAt, notificationType
- [x] Criar índice único para evitar duplicatas

### Lógica de Detecção
- [x] Implementar função para calcular % de ultrapassagem da meta
- [x] Detectar quando gasto real > meta planejada + 20%
- [x] Verificar se notificação já foi enviada no mês
- [x] Coletar dados: categoria, item, valores, diferença

### Integração WhatsApp
- [x] Configurar números destino: 5562985051201, 5562985908516
- [x] Usar sistema de notificações do Manus (notifyOwner)
- [x] Formatar mensagem com detalhes do alerta
- [x] Incluir: nome do item, categoria, meta, real, % ultrapassagem
- [x] Marcar notificação como enviada após sucesso

### Interface e Configuração
- [x] Adicionar botão para testar notificações
- [ ] Mostrar histórico de notificações enviadas
- [ ] Permitir configurar threshold (padrão 20%)
- [ ] Opção para ativar/desativar notificações

### Testes
- [ ] Testar detecção de ultrapassagem
- [x] Testar envio de notificação
- [ ] Testar prevenção de duplicatas
- [ ] Validar formatação da mensagem

## Melhorias Visuais e Análise com IA

### Melhorias no Cabeçalho
- [x] Dar destaque ao título "PLANEJAMENTO FINANCEIRO"
- [x] Aplicar gradiente de cores no título
- [x] Aumentar tamanho da fonte do título
- [x] Adicionar sombra ou efeito visual ao título

### Cores dos Botões de Navegação
- [x] Alterar cor do botão "Gráficos" (de branco para colorido)
- [x] Alterar cor do botão "Visão Anual" (de branco para colorido)
- [x] Alterar cor do botão "Comparativo" (de branco para colorido)
- [x] Alterar cor do botão "Histórico" (de branco para colorido)
- [x] Alterar cor do botão "Verificar Alertas" (de branco para colorido)
- [x] Alterar cor do botão "Duplicar Mês" (de branco para colorido)
- [x] Criar esquema de cores harmônico para os botões

### Análise Financeira com IA
- [x] Criar botão "Análise IA" no dashboard
- [x] Implementar procedure para gerar análise com LLM
- [x] Coletar dados: receitas, despesas, investimentos, tendências
- [x] Prompt para análise financeira detalhada
- [x] Gerar parecer com insights e recomendações
- [x] Criar página para exibir relatório da IA
- [ ] Opção para exportar análise em PDF
- [ ] Incluir gráficos e métricas na análise

## Correções de Layout e Novas Funcionalidades

### Correção de Layout
- [ ] Corrigir sobreposição do campo "Buscar itens" com botão "Gráficos"
- [ ] Ajustar espaçamento entre campo de busca e botões de navegação
- [ ] Garantir responsividade em diferentes tamanhos de tela

### Reordenação de Itens
- [ ] Adicionar campo "orderIndex" ou "position" ao criar item
- [ ] Implementar interface para escolher posição ao adicionar item
- [ ] Adicionar botões de mover para cima/baixo em cada item
- [ ] Atualizar orderIndex de outros itens ao inserir no meio
- [ ] Procedure para reordenar itens

### Edição de Nomes de Itens
- [ ] Adicionar botão de editar ao lado da lixeira
- [ ] Implementar dialog/modal de edição de item
- [ ] Permitir editar nome do item
- [ ] Permitir editar categoria customizada
- [ ] Procedure para atualizar item (updateItem)
- [ ] Validação de nome não vazio

## Correções de Layout e Edição de Itens

### Correção de Layout
- [ ] Reorganizar campo de busca para não sobrepor botões
- [ ] Separar título, busca e navegação em seções distintas

### Edição de Itens
- [x] Adicionar botão "Editar" ao lado da lixeira
- [x] Implementar dialog de edição de nome do item
- [x] Adicionar mutation updateItem no backend
- [x] Atualizar lista após edição

## Novas Funcionalidades Avançadas

### Reordenação Drag-and-Drop
- [ ] Instalar biblioteca de drag-and-drop (dnd-kit ou react-beautiful-dnd)
- [ ] Implementar componente de lista arrastável
- [ ] Adicionar procedure reorderItems no backend
- [ ] Atualizar orderIndex ao soltar item
- [ ] Adicionar feedback visual durante arrasto
- [ ] Persistir nova ordem no banco de dados

### Exportação PDF do Histórico
- [x] Instalar biblioteca de geração de PDF (jsPDF ou pdfmake)
- [x] Criar template de relatório com logo e cabeçalho
- [x] Formatar tabela de histórico para PDF
- [x] Adicionar rodapé com data de geração
- [x] Implementar botão de exportar PDF na página de histórico
- [ ] Aplicar filtros ativos na exportação

### Gerenciamento de Categorias
- [ ] Criar página /categorias
- [ ] Implementar listagem de categorias
- [ ] Adicionar formulário de criação de categoria
- [ ] Implementar edição de categoria existente
- [ ] Adicionar validação antes de excluir (verificar itens vinculados)
- [ ] Implementar exclusão de categoria
- [ ] Adicionar procedures CRUD no backend
- [ ] Criar testes unitários para CRUD de categorias

## Implementação Drag-and-Drop

### Reordenação de Itens
- [ ] Implementar DndContext no Dashboard
- [ ] Criar componente SortableItem para cada item da lista
- [ ] Adicionar feedback visual durante arrasto
- [ ] Implementar handleDragEnd para atualizar ordem
- [ ] Chamar procedure reorderItems ao soltar item
- [ ] Atualizar lista após reordenação
- [ ] Adicionar ícone de "arrastar" em cada item

## Funcionalidade de Drag-and-Drop

### Reordenação de Itens
- [x] Instalar biblioteca dnd-kit
- [x] Criar componente SortableTableRow
- [x] Implementar DndContext nas tabelas
- [x] Adicionar SortableContext para cada categoria
- [x] Implementar handler onDragEnd
- [x] Criar procedure reorderItems no backend
- [x] Atualizar orderIndex no banco de dados
- [x] Adicionar teste unitário para reordenação
- [x] Testar funcionalidade no navegador

## BUGS CRÍTICOS - RESOLVIDOS ✅

### Problemas de Interação no Dashboard
- [x] Campos de input não permitem digitação de valores - CORRIGIDO: listeners removidos da linha inteira
- [x] Botões de edição (lápis) não respondem ao clique - CORRIGIDO: eventos restaurados
- [x] Botões de exclusão (lixeira) não funcionam - CORRIGIDO: funcionalidade restaurada
- [x] Impossível lançar valores em nenhum item - CORRIGIDO: todos os campos funcionando
- [x] Conflito entre drag-and-drop e eventos de clique/input - CORRIGIDO: drag handle isolado
- [x] Listeners do dnd-kit bloqueando eventos - CORRIGIDO: aplicados apenas no ícone de arrastar

## Novas Solicitações do Usuário

### Campo de Categoria Editável
- [x] Transformar campo "Categoria" em dropdown editável
- [x] Criar lista de categorias predefinidas (Receita, Renda, Salário, Moradia, etc.)
- [x] Adicionar opção "Criar nova categoria" no dropdown
- [x] Implementar modal para criar categoria personalizada (usando prompt)
- [x] Salvar novas categorias no banco de dados (via updateItem)
- [x] Atualizar item com categoria selecionada
- [x] Procedure para listar categorias personalizadas (já existente)
- [x] Procedure para criar nova categoria personalizada (usando updateItem)

### Linha de Total por Seção
- [ ] Adicionar linha de total ao final de cada categoria
- [ ] Calcular soma de "Meta (Lícius)" por categoria
- [ ] Calcular soma de "Real (Lícius)" por categoria
- [ ] Calcular soma de "Meta (Marielly)" por categoria
- [ ] Calcular soma de "Real (Marielly)" por categoria
- [ ] Calcular soma de "Total (Real)" por categoria
- [ ] Estilizar linha de total com destaque visual
- [ ] Aplicar em todas as seções (Entradas, Alunos, Investimentos, Fixo, Variável)

### Correções de Bugs
- [x] Investigar e corrigir erro na aba "Gráficos" - CORRIGIDO: rota estava como /charts em vez de /graficos
- [x] Verificar console do navegador para mensagens de erro
- [x] Corrigir problema de carregamento ou renderização
- [ ] Implementar exportação PDF da análise de IA
- [ ] Adicionar botão "Exportar PDF" na página de análise
- [ ] Gerar PDF com formatação profissional
- [ ] Incluir logo, cabeçalho e conteúdo da análise no PDF

## Campo de Categoria Editável (Prioridade Alta)
- [x] Adicionar mutation updateItem no Dashboard
- [x] Substituir texto estático de categoria por Select dropdown
- [x] Adicionar categorias predefinidas no dropdown
- [x] Adicionar opção "Criar nova categoria" no dropdown
- [x] Implementar lógica para criar categoria personalizada
- [x] Testar no navegador
- [x] Escrever testes unitários

## Linha de Totais por Seção (Prioridade Alta)
- [x] Calcular soma de Meta (Lícius) para cada categoria
- [x] Calcular soma de Real (Lícius) para cada categoria
- [x] Calcular soma de Meta (Marielly) para cada categoria
- [x] Calcular soma de Real (Marielly) para cada categoria
- [x] Calcular soma de Total (Real) para cada categoria
- [x] Adicionar TableRow de totais ao final de cada tabela
- [x] Estilizar linha de totais (negrito, borda superior)
- [x] Testar no navegador

## Exportação PDF da Análise de IA (Prioridade Alta)
- [x] Instalar biblioteca jsPDF para geração de PDF no frontend
- [x] Criar função de exportação PDF com template profissional
- [x] Adicionar logo no cabeçalho do PDF (texto estilizado)
- [x] Formatar conteúdo da análise (markdown para PDF)
- [x] Adicionar rodapé com data de geração e numeração de páginas
- [x] Adicionar botão "Exportar PDF" na página de Análise IA
- [x] Testar download do PDF no navegador

## Backup Automático Diário (Prioridade Alta)
- [x] Criar procedure backend para exportar todos os dados financeiros
- [x] Gerar arquivo JSON com dados de itens, valores mensais e histórico (12 meses)
- [x] Fazer upload do backup para S3 com timestamp no nome
- [x] Implementar agendamento automático diário (usando cron às 3h da manhã)
- [x] Adicionar botão manual "Fazer Backup" no dashboard
- [x] Testar backup manual e verificar arquivo no S3
- [x] Escrever testes unitários para procedure de backup
- [x] Documentar processo de restauração de backup (arquivo JSON pode ser baixado do S3)

## BUG: Navegação de Mês no Mobile
- [x] Investigar código dos botões de navegação de mês (anterior/próximo)
- [x] Identificar conflito entre eventos de clique e toque
- [x] Corrigir handlers de eventos para suportar touch em dispositivos móveis
- [x] Adicionar evento onTouchEnd específico para mobile
- [x] Adicionar preventDefault e stopPropagation para evitar conflitos
- [x] Aplicar classe touch-manipulation e tamanho mínimo 44x44px
- [x] Testar em modo responsivo do navegador

## Otimização de Tabelas para Mobile
- [x] Adicionar wrapper com scroll horizontal nas tabelas
- [x] Implementar scrollbar customizado fino e discreto
- [x] Ajustar larguras mínimas das colunas para melhor legibilidade (140px valores, 200px item)
- [x] Adicionar padding extra em células para facilitar toque (0.75rem mobile)
- [x] Implementar scroll suave com -webkit-overflow-scrolling: touch
- [x] Definir tamanho mínimo de tabela (1000px) para garantir legibilidade
- [x] Garantir área de toque mínima de 44x44px em botões e inputs mobile
- [x] Testar em diferentes tamanhos de tela (mobile, tablet)

## BUG CRÍTICO: Navegação de Mês Ainda Não Funciona no Mobile
- [x] Investigar por que onTouchEnd não está funcionando - preventDefault estava bloqueando
- [x] Testar abordagem alternativa - removido eventos complexos
- [x] Remover preventDefault que estava bloqueando eventos
- [x] Simplificar handlers de eventos - apenas onClick simples
- [x] Adicionar type="button" para evitar comportamento de submit
- [x] Testar em dispositivo real ou modo mobile do navegador

## BUG: Alinhamento da Linha de Totais
- [x] Investigar estrutura da linha de totais (colSpan incorreto)
- [x] Adicionar células vazias para colunas de arrastar e categoria - usado colSpan=3
- [x] Ajustar colSpan para considerar todas as colunas - corrigido de 2 para 3
- [x] Testar alinhamento visual no navegador - alinhamento perfeito
- [x] Verificar em todas as seções (ENTRADAS, ALUNOS, INVESTIMENTOS, etc)

## BUG CRÍTICO: Vinculação Entre Meses
- [ ] Investigar por que alterações em dezembro aparecem em novembro
- [ ] Verificar lógica de filtragem de itens por mês no backend
- [ ] Verificar se selectedMonth está sendo usado corretamente
- [ ] Corrigir queries para garantir isolamento entre meses
- [ ] Testar criação/edição/exclusão em meses diferentes

## Gerenciamento de Categorias Personalizadas
- [x] Criar procedure para editar categoria personalizada (updateCategory)
- [x] Criar procedure para deletar categoria personalizada (deleteCategory)
- [x] Adicionar validação: não permitir deletar categoria em uso
- [ ] Adicionar botões de editar e deletar no dropdown de categorias
- [ ] Implementar lógica de edição inline de categoria
- [ ] Implementar confirmação de exclusão de categoria
- [ ] Escrever testes unitários para procedures de categoria

## Limpeza de Dados de Teste
- [x] Remover categoria "Categoria Para Deletar" do banco de dados

## Notificações WhatsApp Automáticas
- [x] Criar tabela notificationsSent no schema para rastrear notificações
- [x] Implementar função de detecção de ultrapassagem de meta (>20%)
- [x] Criar procedure para enviar notificação via WhatsApp
- [x] Integrar verificação no fluxo de upsertEntry
- [x] Configurar números destino: 5562985051201 e 5562985908516
- [x] Testar envio de notificação

## Sistema de Configurações Personalizáveis
- [x] Criar tabela userSettings no schema
- [x] Implementar procedures para salvar/carregar configurações
- [x] Criar página de Configurações (/settings)
- [x] Implementar seletor de cores (abas, botões, texto, fundo)
- [x] Implementar seletor de tipografia (tamanho e família)
- [x] Implementar configurações de gráficos (tipo, rótulos, valores)
- [x] Implementar toggle de backup automático
- [x] Criar função de backup manual
- [x] Criar context para configurações globais
- [x] Aplicar configurações dinamicamente na interface
- [x] Criar dashboard com resumo financeiro
- [x] Adicionar gráficos de distribuição de despesas
- [x] Testar todas as funcionalidades

## Correções Críticas
- [x] BUGFIX: Corrigir valores compartilhados entre meses (valores devem ser isolados por mês/ano)
- [x] Implementar formatação automática de moeda (R$) em todos os campos de valor
- [x] Implementar comportamento de edição tipo Excel (digitar substitui valor anterior)
- [x] Testar isolamento de valores entre meses diferentes

## Refatoração do Fluxo de Conversão de Moeda
- [x] Refatorar CurrencyInput para enviar valores em centavos (número inteiro)
- [x] Remover função parseCurrency do Dashboard
- [x] Atualizar handleUpdateEntry para receber centavos diretamente
- [ ] Testar com valores: 1500 → R$ 1.500,00
- [ ] Testar com valores: 21905,80 → R$ 21.905,80
- [ ] Testar com valores: 1.234,56 → R$ 1.234,56

## Limpeza de Dados e Correção de Soma
- [x] Resetar valores incorretos de dezembro/2025 no banco de dados
- [x] Deletar todas as entries de dezembro/2025 para começar do zero
- [ ] Investigar lógica de cálculo de Receitas, Despesas, Investimentos
- [ ] Corrigir problema de soma incorreta nos totais
- [ ] Testar sistema refatorado com valores limpos

## Feedback Visual em Tempo Real
- [x] Adicionar preview de formatação enquanto usuário digita
- [x] Mostrar "Será salvo como: R$ X.XXX,XX" abaixo do campo
- [ ] Testar feedback visual com diferentes valores

## Copiar Mês Anterior
- [x] Criar procedure copyPreviousMonthPlanned no backend
- [x] Adicionar botão "Copiar Mês Anterior" no dashboard
- [x] Implementar dialog de confirmação
- [x] Copiar apenas valores planejados (Meta Lícius e Meta Marielly)
- [x] Manter valores reais em branco
- [x] Exibir toast de sucesso após cópia
- [ ] Testar funcionalidade

### Botão de Ocultar/Mostrar Valores
- [x] Adicionar botão com ícone de olho no dashboard
- [x] Implementar state para controlar visibilidade dos valores
- [x] Quando oculto: mostrar ícone EyeOff e substituir valores por "•••"
- [x] Quando visível: mostrar ícone Eye e exibir valores normalmente
- [x] Aplicar ocultação em todos os campos monetários da planilha
