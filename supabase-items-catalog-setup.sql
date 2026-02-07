-- ============================================
-- CONFIGURAÇÃO DA TABELA ITEMS_CATALOG NO SUPABASE
-- ============================================
-- Catálogo de itens (produtos/serviços) por usuário

-- ============================================
-- 1. CRIAR A TABELA ITEMS_CATALOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.items_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit_price decimal(12,2) NOT NULL DEFAULT 0,
  unit_type text NOT NULL DEFAULT 'UN' CHECK (unit_type IN ('UN', 'M', 'M2', 'KG', 'HORA', 'SERVICO')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS items_catalog_user_id_idx ON public.items_catalog(user_id);
CREATE INDEX IF NOT EXISTS items_catalog_name_idx ON public.items_catalog(name);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.items_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_pode_ver_proprios_itens" ON public.items_catalog;
DROP POLICY IF EXISTS "usuario_pode_inserir_proprios_itens" ON public.items_catalog;
DROP POLICY IF EXISTS "usuario_pode_atualizar_proprios_itens" ON public.items_catalog;
DROP POLICY IF EXISTS "usuario_pode_deletar_proprios_itens" ON public.items_catalog;

CREATE POLICY "usuario_pode_ver_proprios_itens"
  ON public.items_catalog FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usuario_pode_inserir_proprios_itens"
  ON public.items_catalog FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario_pode_atualizar_proprios_itens"
  ON public.items_catalog FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario_pode_deletar_proprios_itens"
  ON public.items_catalog FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. TRIGGER updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_items_catalog_updated_at ON public.items_catalog;
CREATE TRIGGER update_items_catalog_updated_at
  BEFORE UPDATE ON public.items_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FIM
-- ============================================
