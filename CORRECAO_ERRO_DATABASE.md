# Correção do Erro "Database error saving"

## Problemas Identificados e Corrigidos

### 1. ✅ Verificação de Variáveis do .env
- O arquivo `supabase.ts` já estava lendo corretamente as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- ✅ **Status:** Funcionando corretamente

### 2. ✅ Campos do Perfil
- Os campos enviados (`id`, `email`, `company_name`) estão corretos e correspondem à tabela do banco
- ✅ **Status:** Corrigido - agora há validação adicional antes de inserir

### 3. ✅ Políticas RLS (Row Level Security)
- **Problema principal:** O código tentava inserir o perfil mesmo quando não havia sessão válida ou quando a sessão ainda não estava totalmente estabelecida
- **Solução:** 
  - Adicionada verificação de sessão antes de inserir
  - Adicionado pequeno delay para garantir que a sessão está estabelecida
  - Melhorado tratamento de erros com mensagens específicas

## O Que Foi Corrigido

### Arquivo: `src/lib/supabase.ts`
- ✅ Verifica se há sessão válida antes de inserir
- ✅ Valida que o `id` do perfil corresponde ao usuário autenticado
- ✅ Mensagens de erro mais específicas (incluindo código de erro do Supabase)
- ✅ Logs detalhados para debug

### Arquivo: `src/pages/Signup.tsx`
- ✅ Só tenta salvar o perfil quando há uma sessão válida (`data.session`)
- ✅ Aguarda um pequeno delay para garantir que a sessão está estabelecida
- ✅ Verifica a sessão novamente antes de inserir
- ✅ Tratamento de erros melhorado com mensagens específicas

### Arquivo: `supabase-fix-rls.sql` (NOVO)
- ✅ SQL para recriar as políticas RLS corretamente
- ✅ Use este arquivo se ainda tiver problemas

## O Que Você Precisa Fazer

### Passo 1: Verificar/Corrigir Políticas RLS no Supabase

Execute o SQL do arquivo `supabase-fix-rls.sql` no SQL Editor do Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase-fix-rls.sql`
4. Clique em **Run**

Isso vai garantir que as políticas RLS estão configuradas corretamente.

### Passo 2: Verificar Configuração de Email

Se você ainda está tendo problemas, verifique se a confirmação de email está desabilitada (para desenvolvimento):

1. No Supabase Dashboard, vá em **Authentication** → **Settings**
2. Desmarque **"Enable email confirmations"**
3. Salve

**Por quê?** Se a confirmação de email estiver habilitada, após o cadastro não haverá sessão imediata, então o perfil não será criado até o primeiro login.

### Passo 3: Testar Novamente

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Tente cadastrar um novo usuário:
   - Acesse `/signup`
   - Preencha email, senha e nome da empresa
   - Clique em "Cadastrar"

3. Verifique o console do navegador (F12):
   - Se ainda houver erro, você verá mensagens detalhadas
   - Copie a mensagem de erro completa

### Passo 4: Verificar no Supabase

Após o cadastro, verifique se o registro foi criado:

1. No Supabase Dashboard, vá em **Table Editor**
2. Selecione a tabela `profiles`
3. Verifique se há um registro com o email cadastrado

## Mensagens de Erro Comuns

### "Usuário não autenticado. Faça login primeiro."
- **Causa:** Não há sessão válida quando tenta salvar o perfil
- **Solução:** Verifique se a confirmação de email está desabilitada

### "Erro de permissão. Verifique as políticas RLS no Supabase."
- **Causa:** Políticas RLS não estão configuradas corretamente
- **Solução:** Execute o SQL de `supabase-fix-rls.sql`

### "new row violates row-level security policy"
- **Causa:** A política RLS está bloqueando a inserção
- **Solução:** 
  1. Execute `supabase-fix-rls.sql`
  2. Verifique se `auth.uid()` corresponde ao `id` sendo inserido
  3. Verifique se há uma sessão válida (console do navegador)

## Debug Adicional

Se ainda tiver problemas, adicione estes logs temporários no console do navegador:

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Tente cadastrar novamente
4. Veja as mensagens de log que começam com "Erro ao salvar perfil no Supabase:"

Esses logs vão mostrar:
- Código do erro
- Mensagem do erro
- Detalhes do erro
- Os dados que estavam sendo enviados
- O ID do usuário autenticado

## Próximos Passos

Se após seguir todos os passos ainda houver erro:

1. Copie a mensagem de erro completa do console
2. Verifique no Supabase se a tabela `profiles` existe
3. Verifique se as políticas RLS foram criadas (SQL Editor → execute: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`)
4. Compartilhe essas informações para análise adicional
