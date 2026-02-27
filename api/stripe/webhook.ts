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
    console.error('[webhook] Erro ao atualizar profile por userId');
    throw error;
  }
}

async function updateProfileByStripeSubscriptionId(
  supabase: ReturnType<typeof createClient>,
  stripeSubscriptionId: string,
  data: Record<string, unknown>
) {
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .limit(1);

  if (fetchError) {
    console.error('[webhook] Erro ao buscar profile por stripe_subscription_id');
    throw fetchError;
  }

  if (!profiles?.length) {
    console.warn('[webhook] Nenhum profile para stripe_subscription_id');
    return;
  }

  const { error } = await supabase.from('profiles').update(data).eq('id', profiles[0].id);
  if (error) {
    console.error('[webhook] Erro ao atualizar profile');
    throw error;
  }
}

function subscriptionToProfileData(sub: Stripe.Subscription): Record<string, unknown> {
  const planStatus = ['active', 'trialing'].includes(sub.status) ? 'active' : 'expired';
  const raw = sub.current_period_end;
  const n = raw != null ? (typeof raw === 'number' ? raw : parseInt(String(raw), 10)) : NaN;
  const currentPeriodEnd = !isNaN(n) ? new Date(n * 1000).toISOString() : null;
  if (!currentPeriodEnd) {
    console.warn('[webhook] MISSING_CURRENT_PERIOD_END');
  }
  const data: Record<string, unknown> = {
    stripe_subscription_status: sub.status,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    plan_status: planStatus,
  };
  if (currentPeriodEnd) {
    data.current_period_end = currentPeriodEnd;
  }
  return data;
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405 });
    }

    if (!webhookSecret || !stripeSecretKey) {
      console.error('[webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY');
      return new Response(null, { status: 400 });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('[webhook] Missing stripe-signature header');
      return new Response(null, { status: 400 });
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch (err) {
      console.error('[webhook] Erro ao ler raw body');
      return new Response(null, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('[webhook] Assinatura inválida');
      return new Response(null, { status: 400 });
    }

    let statusFinal = 'ok';

    try {
      const supabase = getSupabaseAdmin();

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const customer = session.customer;
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;

          if (!userId || !subscriptionId) {
            console.warn('[webhook] checkout.session.completed sem userId ou subscription');
            statusFinal = 'skipped';
            break;
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = typeof customer === 'string' ? customer : customer?.id ?? null;
          const raw = subscription.current_period_end;
          const n = raw != null ? (typeof raw === 'number' ? raw : parseInt(String(raw), 10)) : NaN;
          const currentPeriodEnd = !isNaN(n) ? new Date(n * 1000).toISOString() : null;
          if (!currentPeriodEnd) {
            console.warn('[webhook] MISSING_CURRENT_PERIOD_END');
          }

          await updateProfileByUserId(supabase, userId, {
            plan_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_subscription_status: subscription.status,
            current_period_end: currentPeriodEnd ?? undefined,
            cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          });
          statusFinal = 'profile atualizado';
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const data = subscriptionToProfileData(subscription);
          await updateProfileByStripeSubscriptionId(supabase, subscription.id, data);
          statusFinal = 'profile atualizado';
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await updateProfileByStripeSubscriptionId(supabase, subscription.id, {
            plan_status: 'expired',
            stripe_subscription_status: 'canceled',
            cancel_at_period_end: false,
          });
          statusFinal = 'profile atualizado';
          break;
        }

        default:
          statusFinal = 'ignored';
          break;
      }

      console.log('[webhook] type=%s status=%s', event.type, statusFinal);
    } catch (err) {
      console.error('[webhook] Erro type=%s', event.type);
      statusFinal = 'erro';
    }

    return new Response(null, { status: 200 });
  },
};
