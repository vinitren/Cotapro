-- ============================================
-- CORRIGIR COLUNAS DA TABELA CUSTOMERS
-- ============================================
-- Execute este script PRIMEIRO se deu erro "a coluna nome não existe"
-- Ele ajusta a tabela para ter as colunas que o app espera

-- ============================================
-- 1. RENOMEAR "name" para "nome" (se existir)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'nome'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN name TO nome;
  END IF;
END $$;

-- ============================================
-- 2. ADICIONAR COLUNAS QUE FALTAM
-- ============================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf_cnpj text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS data_cadastro date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS endereco jsonb;

-- Valores padrão para colunas NOT NULL que podem estar vazias
UPDATE public.customers SET nome = '' WHERE nome IS NULL;
UPDATE public.customers SET tipo = 'pessoa_fisica' WHERE tipo IS NULL;
UPDATE public.customers SET cpf_cnpj = '' WHERE cpf_cnpj IS NULL;
UPDATE public.customers SET telefone = '' WHERE telefone IS NULL;
UPDATE public.customers SET endereco = '{}'::jsonb WHERE endereco IS NULL;
UPDATE public.customers SET data_cadastro = current_date WHERE data_cadastro IS NULL;

-- Tornar NOT NULL as colunas obrigatórias (após preencher vazios)
ALTER TABLE public.customers ALTER COLUMN nome SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN cpf_cnpj SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN telefone SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN data_cadastro SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN endereco SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN endereco SET DEFAULT '{}'::jsonb;

-- ============================================
-- FIM
-- ============================================
-- Depois execute o arquivo: supabase-customers-completar.sql
