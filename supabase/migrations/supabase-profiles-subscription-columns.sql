-- ============================================
-- COLUNAS DE ASSINATURA/DIAGNÓSTICO NA TABELA PROFILES
-- ============================================
-- Execute no SQL Editor do Supabase
-- Campos para exibir diagnóstico do plano Stripe

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text;

COMMENT ON COLUMN public.profiles.current_period_end IS 'Fim do período atual da assinatura Stripe';
COMMENT ON COLUMN public.profiles.cancel_at_period_end IS 'Se true, assinatura será cancelada ao fim do período';
COMMENT ON COLUMN public.profiles.stripe_subscription_status IS 'Status da assinatura no Stripe (active, canceled, etc)';
