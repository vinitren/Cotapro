-- ============================================
-- Ajuste: numeração sequencial por mês/ano (apenas novos orçamentos)
-- Não altera dados existentes. Novos orçamentos passam a ter número
-- reiniciado a cada mês (por user_id), usando created_at como referência.
-- Depende da migration: supabase-quotes-insert-quote-with-number.sql
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
  ref_month timestamptz;
BEGIN
  -- Lock por user_id para evitar dois orçamentos com o mesmo número em concorrência
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Mês de referência = mês do insert (novo orçamento terá created_at = now())
  ref_month := date_trunc('month', now());

  -- Próximo número: máximo no mesmo user_id e mesmo mês/ano (created_at) + 1
  -- Orçamentos antigos não são alterados; apenas novos entram nessa regra
  SELECT COALESCE(MAX(q.number), 0) + 1
  INTO next_num
  FROM public.quotes q
  WHERE q.user_id = p_user_id
    AND date_trunc('month', q.created_at) = ref_month;

  RETURN QUERY
  INSERT INTO public.quotes (user_id, customer_id, number, total_value, items, status)
  VALUES (p_user_id, p_customer_id, next_num, p_total_value, COALESCE(p_items, '[]'::jsonb), COALESCE(p_status, 'rascunho'))
  RETURNING *;
END;
$$;

-- Permissões (mantidas)
GRANT EXECUTE ON FUNCTION public.insert_quote_with_number(uuid, uuid, decimal(12,2), jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_quote_with_number(uuid, uuid, decimal(12,2), jsonb, text) TO anon;
