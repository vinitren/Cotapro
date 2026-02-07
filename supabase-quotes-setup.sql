-- ============================================
-- CONFIGURAÇÃO DA TABELA QUOTES NO SUPABASE
-- ============================================
-- Colunas usadas pelo app: user_id, customer_id, number, total_value, items (JSON), status
-- created_at e updated_at são preenchidos automaticamente

-- ============================================
-- 1. CRIAR A TABELA QUOTES (apenas colunas existentes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  number integer NOT NULL,
  total_value decimal(12,2) NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS quotes_user_id_idx ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS quotes_customer_id_idx ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON public.quotes(status);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_pode_ver_proprios_quotes" ON public.quotes;
DROP POLICY IF EXISTS "usuario_pode_inserir_proprios_quotes" ON public.quotes;
DROP POLICY IF EXISTS "usuario_pode_atualizar_proprios_quotes" ON public.quotes;
DROP POLICY IF EXISTS "usuario_pode_deletar_proprios_quotes" ON public.quotes;

CREATE POLICY "usuario_pode_ver_proprios_quotes"
  ON public.quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usuario_pode_inserir_proprios_quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario_pode_atualizar_proprios_quotes"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario_pode_deletar_proprios_quotes"
  ON public.quotes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. TRIGGER updated_at (usa função já existente)
-- ============================================
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FIM
-- ============================================
