-- ============================================
-- CONFIGURAÇÃO COMPLETA DO SUPABASE PARA COTAPRO
-- ============================================
-- Copie e cole este SQL inteiro no SQL Editor do Supabase
-- Execute tudo de uma vez ou passo a passo

-- ============================================
-- 1. CRIAR A TABELA PROFILES
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  company_name text,
  updated_at timestamptz default now()
);

-- ============================================
-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
alter table public.profiles enable row level security;

-- ============================================
-- 3. CRIAR POLÍTICAS RLS
-- ============================================

-- Política: Usuário pode ver apenas seu próprio perfil
create policy "Usuário pode ver próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Política: Usuário pode inserir apenas seu próprio perfil
-- IMPORTANTE: Esta política permite inserção quando auth.uid() corresponde ao id
drop policy if exists "Usuário pode inserir próprio perfil" on public.profiles;
create policy "Usuário pode inserir próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Política: Usuário pode atualizar apenas seu próprio perfil
create policy "Usuário pode atualizar próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================
-- 4. (OPCIONAL) TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- ============================================
-- Descomente as linhas abaixo se quiser criar o perfil automaticamente
-- quando um usuário se cadastra

/*
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
*/

-- ============================================
-- FIM DA CONFIGURAÇÃO
-- ============================================
-- Após executar este SQL:
-- 1. Crie o arquivo .env na raiz do projeto
-- 2. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
-- 3. Reinicie o servidor (npm run dev)
-- 4. Teste o cadastro e login!
