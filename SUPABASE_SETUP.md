# Guia de Configuração do Supabase

Este guia vai te ajudar a configurar completamente o Supabase para o CotaPro.

## 1. Criar o arquivo `.env`

Na raiz do projeto, crie um arquivo chamado `.env` (sem extensão) com o seguinte conteúdo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### Como obter essas informações:

1. Acesse [https://supabase.com](https://supabase.com) e faça login
2. Crie um novo projeto (ou selecione um existente)
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → use como `VITE_SUPABASE_URL`
   - **anon/public key** → use como `VITE_SUPABASE_ANON_KEY`

**⚠️ IMPORTANTE:** Nunca commite o arquivo `.env` no Git! Ele já está no `.gitignore`.

---

## 2. Criar a tabela `profiles`

No Supabase, vá em **SQL Editor** e execute o seguinte SQL:

```sql
-- Criar a tabela profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  company_name text,
  updated_at timestamptz default now()
);
```

### Explicação:
- `id`: UUID que referencia o usuário do `auth.users` (chave primária)
- `email`: Email do usuário (opcional, pode vir do auth.users)
- `company_name`: Nome da empresa (obrigatório no cadastro)
- `updated_at`: Data da última atualização

---

## 3. Configurar Row Level Security (RLS)

Execute este SQL para garantir que usuários só vejam/editam seus próprios perfis:

```sql
-- Habilitar RLS na tabela profiles
alter table public.profiles enable row level security;

-- Política: Usuário pode ver apenas seu próprio perfil
create policy "Usuário pode ver próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Política: Usuário pode inserir apenas seu próprio perfil
create policy "Usuário pode inserir próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Política: Usuário pode atualizar apenas seu próprio perfil
create policy "Usuário pode atualizar próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);
```

---

## 4. (Opcional) Criar trigger para criar perfil automaticamente

Se quiser que o perfil seja criado automaticamente quando um usuário se cadastra, execute:

```sql
-- Função para criar perfil automaticamente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, company_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'company_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função quando um novo usuário é criado
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Nota:** Mesmo com o trigger, o código do app também faz `upsertProfile` para garantir que o perfil seja criado/atualizado corretamente.

---

## 5. Verificar se está funcionando

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Teste o cadastro:**
   - Acesse `/signup`
   - Crie uma conta com email, senha e nome da empresa
   - Verifique no Supabase (tabela `profiles`) se o registro foi criado

3. **Teste o login:**
   - Faça logout
   - Acesse `/login`
   - Entre com as credenciais criadas
   - Deve redirecionar para o Dashboard

---

## 6. Configurações adicionais no Supabase (recomendado)

### Desabilitar confirmação de email (para desenvolvimento)

Se quiser que o login funcione imediatamente sem confirmar email:

1. Vá em **Authentication** → **Settings**
2. Desmarque **"Enable email confirmations"**
3. Salve

**⚠️ ATENÇÃO:** Em produção, mantenha a confirmação de email habilitada!

### Configurar URL de redirecionamento

1. Vá em **Authentication** → **URL Configuration**
2. Adicione suas URLs:
   - **Site URL:** `http://localhost:5173` (desenvolvimento)
   - **Redirect URLs:** `http://localhost:5173/**` (desenvolvimento)
   - Para produção, adicione também sua URL de produção

---

## Troubleshooting

### Erro: "relation 'profiles' does not exist"
- Verifique se executou o SQL da criação da tabela
- Confirme que está no schema `public`

### Erro: "new row violates row-level security policy"
- Verifique se as políticas RLS foram criadas corretamente
- Confirme que o usuário está autenticado

### Erro: "Invalid API key"
- Verifique se copiou a chave correta (anon/public, não service_role)
- Confirme que o arquivo `.env` está na raiz do projeto
- Reinicie o servidor após criar/editar o `.env`

### O site não carrega
- Verifique o console do navegador (F12) para erros
- Confirme que as variáveis no `.env` estão corretas
- Tente limpar o cache: `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac)

---

## Próximos passos

Após configurar tudo:
- ✅ Teste cadastro e login
- ✅ Verifique se o nome da empresa aparece no Dashboard
- ✅ Teste logout e login novamente
- ✅ Verifique se a sessão persiste após recarregar a página
