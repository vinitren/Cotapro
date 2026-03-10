-- ============================================
-- Função: insert_quote_with_number
-- Gera o próximo número do orçamento por usuário e insere em public.quotes.
-- Evita número duplicado em concorrência (lock por user_id).
-- Compatível com o uso em src/lib/supabase.ts (RPC com p_user_id, p_customer_id, p_total_value, p_items, p_status).
-- ============================================

CREATE OR REPLACE FUNCTION public.insert_quote_with_number(
  p_user_id uuid,
  p_customer_id uuid,
  p_total_value decimal(12,2),
  p_items jsonb,
  p_status text
)
RETURNS SETOF public.quotes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  -- Lock por user_id para evitar dois orçamentos com o mesmo número em concorrência
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COALESCE(MAX(number), 0) + 1
  INTO next_num
  FROM public.quotes
  WHERE user_id = p_user_id;

  RETURN QUERY
  INSERT INTO public.quotes (user_id, customer_id, number, total_value, items, status)
  VALUES (p_user_id, p_customer_id, next_num, p_total_value, COALESCE(p_items, '[]'::jsonb), COALESCE(p_status, 'rascunho'))
  RETURNING *;
END;
$$;

-- Permite que usuários autenticados chamem a função (RLS continua valendo no INSERT)
GRANT EXECUTE ON FUNCTION public.insert_quote_with_number(uuid, uuid, decimal(12,2), jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_quote_with_number(uuid, uuid, decimal(12,2), jsonb, text) TO anon;
