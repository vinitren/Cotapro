import Stripe from 'stripe';

interface CheckoutBody {
  userId: string;
  email: string;
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.SITE_URL;

  if (!secretKey || !priceId || !siteUrl) {
    console.error('Missing env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID or SITE_URL');
    return new Response(
      JSON.stringify({ error: 'Stripe não configurado' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Body inválido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { userId, email } = body;
  if (!userId || !email) {
    return new Response(
      JSON.stringify({ error: 'userId e email são obrigatórios' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/configuracoes/conta?status=sucesso`,
      cancel_url: `${siteUrl}/configuracoes/conta?status=cancelado`,
      metadata: { userId },
      customer_email: email,
    });

    if (!session.url) {
      return new Response(
        JSON.stringify({ error: 'Stripe não retornou URL de checkout' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro ao criar sessão de checkout' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
