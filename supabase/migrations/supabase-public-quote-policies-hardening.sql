-- ============================================
-- ENDURECIMENTO RLS – PÁGINA PÚBLICA DE ORÇAMENTO
-- ============================================
-- Executar APÓS supabase-public-quote-policies.sql
-- Regra: anon só acessa orçamentos PUBLICÁVEIS (status enviado, aprovado ou expirado).
-- Rascunho e recusado não são acessíveis pelo link público.
-- ============================================

-- 1. QUOTES: anon só lê orçamentos com status publicável
DROP POLICY IF EXISTS "anon_pode_ver_quotes_link_publico" ON public.quotes;
CREATE POLICY "anon_pode_ver_quotes_link_publico"
  ON public.quotes FOR SELECT
  TO anon
  USING (status IN ('enviado', 'aprovado', 'expirado'));

-- 2. CUSTOMERS: anon só lê clientes vinculados a orçamentos PUBLICÁVEIS
DROP POLICY IF EXISTS "anon_pode_ver_clientes_de_quotes" ON public.customers;
CREATE POLICY "anon_pode_ver_clientes_de_quotes"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.customer_id = customers.id
        AND q.status IN ('enviado', 'aprovado', 'expirado')
    )
  );

-- 3. PROFILES: anon só lê perfis de usuários que têm orçamentos PUBLICÁVEIS
DROP POLICY IF EXISTS "anon_pode_ver_profiles_de_quotes" ON public.profiles;
CREATE POLICY "anon_pode_ver_profiles_de_quotes"
  ON public.profiles FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.user_id = profiles.id
        AND q.status IN ('enviado', 'aprovado', 'expirado')
    )
  );

-- ============================================
-- FIM
-- ============================================
