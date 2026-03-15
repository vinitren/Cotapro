import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return jsonResponse({ error: 'Authorization: Bearer <access_token> é obrigatório' }, 401);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Supabase não configurado' }, 500);
  }

  if (!stripeSecretKey) {
    return jsonResponse({ error: 'Stripe não configurado' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse({ error: 'Token inválido ou expirado' }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: 'Erro ao buscar perfil' }, 500);
  }

  const stripeCustomerId = profile?.stripe_customer_id;

  if (!stripeCustomerId || typeof stripeCustomerId !== 'string') {
    return jsonResponse(
      { error: 'Você ainda não possui assinatura ativa. Ative um plano primeiro.' },
      400
    );
  }

  const siteUrl = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (!siteUrl) {
    console.error('Missing env: SITE_URL');
    return jsonResponse({ error: 'Stripe não configurado' }, 500);
  }
  const returnUrl = `${siteUrl}/configuracoes/conta`;

  try {
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' });

    const portalConfigId = process.env.STRIPE_PORTAL_CONFIGURATION_ID || 'bpc_1T5tf3PVQsM9VEy5Z7l82UKn';

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
      configuration: portalConfigId,
    });

    return jsonResponse({ url: session.url }, 200);
  } catch (err) {
    console.error('[portal] Erro ao criar sessão:', err);
    return jsonResponse({ error: 'Erro ao criar portal de assinatura' }, 500);
  }
}
