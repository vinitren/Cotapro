import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function updateProfileByUserId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  data: Record<string, unknown>
) {
  const { error } = await supabase.from('profiles').update(data).eq('id', userId);
  if (error) {
    console.error('[webhook] Erro ao atualizar profile por userId:', userId, error);
    throw error;
  }
}

async function updateProfileByStripeCustomerId(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string,
  data: Record<string, unknown>
) {
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .limit(1);

  if (fetchError) {
    console.error('[webhook] Erro ao buscar profile por stripe_customer_id:', fetchError);
    throw fetchError;
  }

  if (!profiles?.length) {
    console.warn('[webhook] Nenhum profile encontrado para stripe_customer_id:', stripeCustomerId);
    return;
  }

  const { error } = await supabase.from('profiles').update(data).eq('id', profiles[0].id);
  if (error) {
    console.error('[webhook] Erro ao atualizar profile:', error);
    throw error;
  }
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405 });
    }

    if (!webhookSecret || !stripeSecretKey) {
      console.error('[webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY');
      return new Response(null, { status: 500 });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('[webhook] Missing stripe-signature header');
      return new Response(null, { status: 400 });
    }

    // Raw body obrigatório para validar assinatura Stripe na Vercel (não usar json())
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch (err) {
      console.error('[webhook] Erro ao ler raw body:', err);
      return new Response(null, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(stripeSecretKey);
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('[webhook] Assinatura inválida:', err);
      return new Response(null, { status: 400 });
    }

    let userId: string | undefined;
    let statusFinal = 'ok';

    try {
      const supabase = getSupabaseAdmin();

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          userId = session.metadata?.userId;
          const customer = session.customer;
          const subscription = session.subscription;

          if (!userId) {
            console.warn('[webhook] checkout.session.completed sem metadata.userId');
            statusFinal = 'skipped: sem metadata.userId';
            break;
          }

          await updateProfileByUserId(supabase, userId, {
            plan_status: 'active',
            stripe_customer_id: typeof customer === 'string' ? customer : customer?.id ?? null,
            stripe_subscription_id: typeof subscription === 'string' ? subscription : subscription?.id ?? null,
          });
          statusFinal = 'profile atualizado: plan_status=active';
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
          const status = subscription.status;

          if (!customerId) {
            console.warn('[webhook] customer.subscription.updated sem customer');
            statusFinal = 'skipped: sem customer';
            break;
          }

          const planStatus = ['active', 'trialing'].includes(status) ? 'active' : 'expired';
          await updateProfileByStripeCustomerId(supabase, customerId, {
            plan_status: planStatus,
            stripe_subscription_id: subscription.id,
          });
          statusFinal = `profile atualizado: plan_status=${planStatus}`;
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

          if (!customerId) {
            console.warn('[webhook] customer.subscription.deleted sem customer');
            statusFinal = 'skipped: sem customer';
            break;
          }

          await updateProfileByStripeCustomerId(supabase, customerId, {
            plan_status: 'expired',
            stripe_subscription_id: null,
          });
          statusFinal = 'profile atualizado: plan_status=expired';
          break;
        }

        default:
          statusFinal = 'ignored: evento não tratado';
          break;
      }

      console.log('[webhook] event.type=%s userId=%s statusFinal=%s', event.type, userId ?? '—', statusFinal);
    } catch (err) {
      console.error('[webhook] Erro ao processar evento:', event.type, err);
      statusFinal = 'erro';
      return new Response(null, { status: 500 });
    }

    return new Response(null, { status: 200 });
  },
};
