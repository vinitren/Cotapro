-- ============================================
-- CONFIGURAÇÃO DA TABELA CUSTOMERS NO SUPABASE
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- Pode ser executado mais de uma vez (usa IF NOT EXISTS / DROP IF EXISTS)

-- ============================================
-- 1. CRIAR A TABELA CUSTOMERS (só se não existir)
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('pessoa_fisica', 'pessoa_juridica')),
  nome text NOT NULL,
  cpf_cnpj text NOT NULL,
  telefone text NOT NULL,
  email text,
  observacoes text,
  data_cadastro date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  endereco jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================
-- 2. CRIAR ÍNDICES (só se não existirem)
-- ============================================
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_nome_idx ON public.customers(nome);

-- ============================================
-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. REMOVER POLÍTICAS ANTIGAS E CRIAR NOVAS
-- ============================================
DROP POLICY IF EXISTS "Usuário pode ver próprios clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuário pode inserir próprios clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuário pode atualizar próprios clientes" ON public.customers;
DROP POLICY IF EXISTS "Usuário pode deletar próprios clientes" ON public.customers;
DROP POLICY IF EXISTS "usuario_pode_ver_proprios_clientes" ON public.customers;
DROP POLICY IF EXISTS "usuario_pode_inserir_proprios_clientes" ON public.customers;
DROP POLICY IF EXISTS "usuario_pode_atualizar_proprios_clientes" ON public.customers;
DROP POLICY IF EXISTS "usuario_pode_deletar_proprios_clientes" ON public.customers;

CREATE POLICY "usuario_pode_ver_proprios_clientes"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usuario_pode_inserir_proprios_clientes"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario_pode_atualizar_proprios_clientes"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario_pode_deletar_proprios_clientes"
  ON public.customers FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. FUNÇÃO E TRIGGER updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FIM DA CONFIGURAÇÃO
-- ============================================
