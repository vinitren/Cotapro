-- ============================================
-- ENFORCEMENT DE PLANO NA CRIAÇÃO DE ORÇAMENTO
-- ============================================
-- A RPC insert_quote_with_number passa a validar plan_status/trial_ends_at
-- antes do lock e do INSERT. Quem não tiver plano válido não consegue criar.
--
-- Dependência: public.profiles deve ter as colunas plan_status (text) e
-- trial_ends_at (timestamptz). Elas são preenchidas pelo webhook Stripe e
-- pelo fluxo de trial; se não existirem, adicione-as antes desta migration.
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
  v_plan_status text;
  v_trial_ends_at timestamptz;
  next_num integer;
  ref_month timestamptz;
BEGIN
  -- Validação de plano: permitir só active ou trialing com trial_ends_at > now()
  SELECT plan_status, trial_ends_at
  INTO v_plan_status, v_trial_ends_at
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COTAPRO_PLAN_REQUIRED: Plano inativo ou período de teste expirado.';
  END IF;

  IF NOT (
    (v_plan_status = 'active')
    OR (v_plan_status = 'trialing' AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now())
  ) THEN
    RAISE EXCEPTION 'COTAPRO_PLAN_REQUIRED: Plano inativo ou período de teste expirado.';
  END IF;

  -- Lock por user_id para evitar dois orçamentos com o mesmo número em concorrência
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Mês de referência = mês do insert (novo orçamento terá created_at = now())
  ref_month := date_trunc('month', now());

  -- Próximo número: quotes.number é TEXT; só consideramos valores numéricos e salvamos como TEXT
  SELECT COALESCE(MAX(
    CASE WHEN q.number IS NOT NULL AND trim(q.number) ~ '^[0-9]+$' THEN (trim(q.number))::integer END
  ), 0) + 1
  INTO next_num
  FROM public.quotes q
  WHERE q.user_id = p_user_id
    AND date_trunc('month', q.created_at) = ref_month;

  RETURN QUERY
  INSERT INTO public.quotes (user_id, customer_id, number, total_value, items, status)
  VALUES (p_user_id, p_customer_id, next_num::text, p_total_value, COALESCE(p_items, '[]'::jsonb), COALESCE(p_status, 'rascunho'))
  RETURNING *;
END;
$$;

-- Permissões (mantidas)
GRANT EXECUTE ON FUNCTION public.insert_quote_with_number(uuid, uuid, decimal(12,2), jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_quote_with_number(uuid, uuid, decimal(12,2), jsonb, text) TO anon;
