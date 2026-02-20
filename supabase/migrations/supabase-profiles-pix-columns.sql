-- ============================================
-- ADICIONAR COLUNAS PIX NA TABELA PROFILES
-- ============================================
-- Execute no SQL Editor do Supabase
-- ETAPA 1: Dados de pagamento Pix por usuário

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_type text,
  ADD COLUMN IF NOT EXISTS pix_name text,
  ADD COLUMN IF NOT EXISTS pix_city text;

COMMENT ON COLUMN public.profiles.pix_key IS 'Chave Pix (CPF, CNPJ, email, telefone ou aleatória)';
COMMENT ON COLUMN public.profiles.pix_type IS 'Tipo da chave: cpf, cnpj, email, phone, random';
COMMENT ON COLUMN public.profiles.pix_name IS 'Nome do titular da chave Pix';
COMMENT ON COLUMN public.profiles.pix_city IS 'Cidade do titular (opcional, até 15 caracteres para Pix)';
