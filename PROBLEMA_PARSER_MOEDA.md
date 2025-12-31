# Problema do Parser de Moeda

## Situação Atual

Após múltiplas tentativas de refatoração, o sistema de conversão de moeda ainda apresenta problemas:

- **Sintoma**: Ao digitar "21905,80" em um campo, o sistema salva valores incorretos (ex: R$ 43.982,80 em vez de R$ 21.905,80)
- **Valores no dashboard**: Receitas R$ 43.982,80, Despesas R$ 48.980,10, Saldo -R$ 4.997,30 (todos incorretos)

## Fluxo Atual (Refatorado)

1. **CurrencyInput** (client/src/components/CurrencyInput.tsx):
   - Recebe: `value` em centavos
   - Exibe: Formatado como "R$ 1.234,56" (quando não está editando)
   - Ao focar: Mostra valor numérico "1234,56"
   - Ao blur: Converte para centavos e envia via `onBlur(cents)`
   - Exemplo: "21905,80" → 2190580 centavos

2. **Dashboard** (client/src/pages/Dashboard.tsx):
   - Recebe centavos do CurrencyInput
   - Passa centavos para `upsertEntry.mutate({ [field]: cents })`
   - Exemplo: 2190580 centavos

3. **Backend** (server/routers.ts e server/db.ts):
   - Recebe centavos do frontend
   - Salva centavos diretamente no banco
   - Exemplo: 2190580 centavos

## Problema Identificado

O código parece estar correto em todos os níveis, mas os valores salvos no banco estão incorretos. Possíveis causas:

1. **Cache do navegador**: O código antigo (com parseCurrency) pode estar em cache
2. **Múltiplas chamadas**: O sistema pode estar salvando o valor duas vezes
3. **Valores antigos**: O banco pode conter valores de tentativas anteriores que não foram limpos

## Solução Recomendada

1. **Limpar completamente dezembro/2025**:
   ```sql
   DELETE FROM entries WHERE month = 12 AND year = 2025;
   ```

2. **Limpar cache do navegador**: Ctrl+Shift+R ou Ctrl+F5

3. **Testar em campo vazio**: Criar uma nova entry do zero em vez de editar existente

4. **Adicionar logs**: Temporariamente adicionar console.log em:
   - CurrencyInput.handleBlur (antes de onBlur)
   - Dashboard.handleUpdateEntry (valor recebido)
   - Backend upsertEntry (valor a ser salvo)

5. **Criar teste unitário**: Validar fluxo completo de conversão

## Próximos Passos

- [ ] Limpar todas as entries de dezembro/2025
- [ ] Limpar cache do navegador
- [ ] Adicionar logs temporários para debug
- [ ] Testar com valor simples (ex: "1500")
- [ ] Verificar banco de dados após cada teste
- [ ] Remover logs após confirmar funcionamento
