-- ============================================
-- FKs PARA RELAÇÕES NA PÁGINA PÚBLICA
-- ============================================
-- Execute no SQL Editor do Supabase ANTES de usar a query
-- com relações na página pública.
--
-- Permite: .select('*, customers(*), profiles(*)') no quotes
-- ============================================

DO $$
BEGIN
  -- quotes.customer_id -> customers.id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_customer_id_fkey') THEN
    ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id);
  END IF;

  -- quotes.user_id -> profiles.id (profiles.id = auth.users.id)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_user_id_profiles_fkey') THEN
    ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id);
  END IF;
END $$;
