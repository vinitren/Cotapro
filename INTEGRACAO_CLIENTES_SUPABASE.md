# Integração de Clientes com Supabase

## ✅ O que foi implementado

Agora quando você criar, editar ou excluir um cliente, ele será salvo automaticamente na tabela `customers` do Supabase vinculado ao seu `user_id`.

## 📋 Passos para Configurar

### 1. Criar a tabela `customers` no Supabase

Execute o SQL do arquivo `supabase-customers-setup.sql` no SQL Editor do Supabase:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo completo de `supabase-customers-setup.sql`
4. Clique em **Run**

Isso vai criar:
- ✅ Tabela `customers` com todos os campos necessários
- ✅ Coluna `user_id` vinculada ao `auth.users`
- ✅ Políticas RLS (cada usuário só vê seus próprios clientes)
- ✅ Índices para melhor performance
- ✅ Trigger para atualizar `updated_at` automaticamente

### 2. Testar a integração

1. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Faça login** no sistema

3. **Crie um cliente:**
   - Vá em **Clientes** → **Novo Cliente**
   - Preencha os dados e salve
   - O cliente será salvo no Supabase automaticamente

4. **Verifique no Supabase:**
   - Vá em **Table Editor** → **customers**
   - Você verá o cliente criado com seu `user_id`

## 🔒 Segurança (RLS)

As políticas RLS garantem que:
- ✅ Cada usuário só vê seus próprios clientes
- ✅ Cada usuário só pode criar clientes para si mesmo
- ✅ Cada usuário só pode editar/deletar seus próprios clientes

## 🔄 Como funciona

### Ao fazer login:
1. O sistema carrega automaticamente seus clientes do Supabase
2. Os clientes são exibidos na tela

### Ao criar cliente:
1. Os dados são salvos no Supabase com seu `user_id`
2. O cliente aparece imediatamente na lista
3. Se houver erro, uma mensagem é exibida

### Ao editar cliente:
1. A atualização é feita no Supabase
2. A lista é atualizada automaticamente

### Ao excluir cliente:
1. O cliente é removido do Supabase
2. A lista é atualizada automaticamente

## 📊 Estrutura da Tabela

```sql
customers
├── id (uuid, primary key)
├── user_id (uuid, foreign key → auth.users)
├── tipo (pessoa_fisica | pessoa_juridica)
├── nome (text)
├── cpf_cnpj (text)
├── telefone (text)
├── email (text, nullable)
├── observacoes (text, nullable)
├── data_cadastro (date)
├── endereco (jsonb) - contém: rua, numero, complemento, bairro, cidade, estado, cep
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

## 🐛 Troubleshooting

### Erro: "Erro de permissão. Verifique as políticas RLS"
- Execute novamente o SQL de `supabase-customers-setup.sql`
- Verifique se você está logado

### Clientes não aparecem após login
- Verifique o console do navegador (F12) para erros
- Confirme que a tabela `customers` foi criada no Supabase
- Verifique se há clientes com seu `user_id` na tabela

### Cliente não é salvo
- Verifique se está logado
- Verifique o console para mensagens de erro
- Confirme que as políticas RLS foram criadas corretamente

## 📝 Notas Importantes

- **Fallback local:** Se houver erro ao salvar no Supabase, o cliente ainda será salvo localmente (no navegador) como fallback
- **Sincronização:** Os clientes são carregados automaticamente ao fazer login
- **Isolamento:** Cada usuário tem seus próprios clientes - não há compartilhamento entre usuários
