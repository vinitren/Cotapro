-- ============================================
-- POLÍTICAS RLS PARA PÁGINA PÚBLICA DE ORÇAMENTO
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- Objetivo: permitir que visitantes anônimos (sem login) vejam
-- o orçamento em /orcamento/:id com dados da empresa e do cliente.
--
-- SEGURANÇA: As políticas são ADITIVAS - não alteram o acesso
-- de usuários autenticados. Apenas adicionam leitura para anon.
--
-- Restrições:
-- - quotes: anon pode ler (o id vem do link compartilhado)
-- - customers: anon só lê clientes que aparecem em algum orçamento
-- - profiles: anon só lê perfis de usuários que têm orçamentos
-- ============================================

-- 1. QUOTES: anon pode ler orçamentos (necessário para o link público)
CREATE POLICY "anon_pode_ver_quotes_link_publico"
  ON public.quotes FOR SELECT
  TO anon
  USING (true);

-- 2. CUSTOMERS: anon só lê clientes vinculados a orçamentos
CREATE POLICY "anon_pode_ver_clientes_de_quotes"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.customer_id = customers.id
    )
  );

-- 3. PROFILES: anon só lê perfis de usuários que têm orçamentos
CREATE POLICY "anon_pode_ver_profiles_de_quotes"
  ON public.profiles FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.user_id = profiles.id
    )
  );

-- ============================================
-- FIM
-- ============================================
-- Após executar: teste a página pública em modo anônimo
-- (aba anônima ou outro navegador sem login).
--
-- ROLLBACK (se precisar reverter):
-- DROP POLICY IF EXISTS "anon_pode_ver_quotes_link_publico" ON public.quotes;
-- DROP POLICY IF EXISTS "anon_pode_ver_clientes_de_quotes" ON public.customers;
-- DROP POLICY IF EXISTS "anon_pode_ver_profiles_de_quotes" ON public.profiles;
