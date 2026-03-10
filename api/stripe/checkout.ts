import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

interface CheckoutBody {
  email?: string;
}

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.SITE_URL;

  if (!secretKey || !priceId || !siteUrl) {
    console.error('Missing env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID or SITE_URL');
    return jsonResponse({ error: 'Stripe não configurado' }, 500);
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return jsonResponse({ error: 'Supabase não configurado' }, 500);
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return jsonResponse(
      { error: 'Authorization: Bearer <access_token> é obrigatório' },
      401
    );
  }

  let body: CheckoutBody = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') body = parsed;
  } catch {
    // body opcional; usuário vem do token
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ error: 'Usuário não autenticado' }, 401);
  }

  const email = user.email || (body.email && String(body.email).trim()) || '';
  if (!email) {
    return jsonResponse({ error: 'Usuário sem email cadastrado' }, 400);
  }

  try {
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/configuracoes/conta?status=sucesso`,
      cancel_url: `${siteUrl}/configuracoes/conta?status=cancelado`,
      metadata: { userId: user.id },
      customer_email: email,
    });

    if (!session.url) {
      return jsonResponse({ error: 'Stripe não retornou URL de checkout' }, 500);
    }

    return jsonResponse({ url: session.url }, 200);
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return jsonResponse({ error: 'Erro ao criar sessão de checkout' }, 500);
  }
}
