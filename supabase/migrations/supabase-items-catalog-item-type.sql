-- ============================================
-- Campo item_type em items_catalog (Produto / Serviço)
-- ============================================
-- Valores: 'product' | 'service'. Default 'product' para itens existentes.

ALTER TABLE public.items_catalog
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product';

ALTER TABLE public.items_catalog
  DROP CONSTRAINT IF EXISTS items_catalog_item_type_check;

ALTER TABLE public.items_catalog
  ADD CONSTRAINT items_catalog_item_type_check
  CHECK (item_type IN ('product', 'service'));

-- Garantir que registros antigos (caso existam sem default) fiquem como product
UPDATE public.items_catalog
SET item_type = 'product'
WHERE item_type IS NULL OR item_type NOT IN ('product', 'service');
