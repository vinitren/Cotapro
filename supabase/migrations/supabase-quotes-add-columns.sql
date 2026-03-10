-- ============================================
-- Adiciona colunas usadas pelo app na tabela quotes
-- (observations, notes, validity_days, discount_percentage, discount_value)
-- ============================================
-- Use ADD COLUMN IF NOT EXISTS para ser seguro em ambientes já atualizados.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS observations text;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS validity_days integer;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS discount_percentage decimal(12,2) DEFAULT 0;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS discount_value decimal(12,2) DEFAULT 0;
