-- ============================================
-- Colunas para auto-salvar itens do orçamento no catálogo
-- ============================================

ALTER TABLE public.items_catalog
  ADD COLUMN IF NOT EXISTS created_from_quote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_from_quote_at timestamptz;
