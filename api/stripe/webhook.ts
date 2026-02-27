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
  supabase: any,
  userId: string,
  data: Record<string, any>
) {
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select('id,current_period_end')
    .maybeSingle();
  if (error) {
    console.error('[webhook] Erro ao atualizar profile por userId', error);
    throw error;
  }
  console.log('[webhook] updateProfileByUserId current_period_end=', (updated as any)?.current_period_end);
}

async function updateProfileByStripeSubscriptionId(
  supabase: any,
  stripeSubscriptionId: string,
  data: Record<string, any>
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

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', profiles[0].id)
    .select('id,current_period_end')
    .maybeSingle();
  if (error) {
    console.error('[webhook] Erro ao atualizar profile', error);
    throw error;
  }
  console.log('[webhook] updateProfileByStripeSubscriptionId current_period_end=', (updated as any)?.current_period_end);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).send('ok');
    return;
  }

  if (!webhookSecret || !stripeSecretKey) {
    console.error('[webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY');
    res.status(400).send('ok');
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    console.error('[webhook] Missing stripe-signature header');
    res.status(400).send('ok');
    return;
  }

  let rawBody: string;
  try {
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf-8');
    } else {
      rawBody = String(req.body ?? '');
    }
  } catch (err) {
    console.error('[webhook] Erro ao ler raw body');
    res.status(400).send('ok');
    return;
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[webhook] Assinatura inválida');
    res.status(400).send('ok');
    return;
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

        const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription & { current_period_end?: number };
        const customerId = typeof customer === 'string' ? customer : customer?.id ?? null;
        const patch: Record<string, any> = {
          plan_status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_subscription_status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
        };
        if (typeof sub.current_period_end === 'number') {
          patch.current_period_end = new Date(sub.current_period_end * 1000).toISOString();
        }
        console.log('[stripe] checkout.completed', { subId: sub.id, hasPeriodEnd: !!sub.current_period_end, periodEnd: patch.current_period_end });
        console.log('[webhook] BEFORE update event.type=%s patch.current_period_end=%s', event.type, patch.current_period_end);

        await updateProfileByUserId(supabase, userId, patch);
        statusFinal = 'profile atualizado';
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
        const planStatus = ['active', 'trialing'].includes(subscription.status) ? 'active' : 'expired';
        const patch: Record<string, any> = {
          stripe_subscription_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          plan_status: planStatus,
        };
        if (typeof subscription.current_period_end === 'number') {
          patch.current_period_end = new Date(
            subscription.current_period_end * 1000
          ).toISOString();
        }
        console.log('[stripe] sub.updated', { subId: subscription.id, hasPeriodEnd: !!subscription.current_period_end, periodEnd: patch.current_period_end });
        console.log('[webhook] BEFORE update event.type=%s patch.current_period_end=%s', event.type, patch.current_period_end);

        await updateProfileByStripeSubscriptionId(supabase, subscription.id, patch);
        statusFinal = 'profile atualizado';
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const patchDeleted = {
          plan_status: 'expired',
          stripe_subscription_status: 'canceled',
          cancel_at_period_end: false,
        };
        console.log('[webhook] BEFORE update event.type=%s patch.current_period_end=%s', event.type, (patchDeleted as any).current_period_end);
        await updateProfileByStripeSubscriptionId(supabase, subscription.id, patchDeleted);
        statusFinal = 'profile atualizado';
        break;
      }

      default:
        statusFinal = 'ignored';
        break;
    }

    console.log('[webhook] type=%s status=%s', event.type, statusFinal);
  } catch (err) {
    console.error('[webhook] Erro type=%s', event.type, err);
    statusFinal = 'erro';
  }

  res.status(statusFinal === 'erro' ? 500 : 200).send('ok');
}
