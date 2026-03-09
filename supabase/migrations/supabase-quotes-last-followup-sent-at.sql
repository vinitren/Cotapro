-- Adiciona coluna para registrar data/hora do último follow-up enviado (orçamento)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS last_followup_sent_at timestamptz NULL;
