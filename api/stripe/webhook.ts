import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

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
    .select('id, stripe_subscription_id, stripe_customer_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .limit(1);

  if (fetchError) {
    console.error('[webhook] Erro ao buscar profile por stripe_subscription_id');
    throw fetchError;
  }

  if (!profiles?.length) {
    console.warn('[webhook] Nenhum profile para subscription', stripeSubscriptionId);
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
    console.error('[webhook] 400 motivo=missing_secret event.type=N/A header_stripe_signature=', !!req.headers['stripe-signature'], 'webhookSecret_prefix=', webhookSecret ? webhookSecret.slice(0, 6) : '(vazio)', 'rawBody_len=N/A');
    res.status(400).send('ok');
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    console.error('[webhook] 400 motivo=missing_signature event.type=N/A header_stripe_signature=false webhookSecret_prefix=', webhookSecret.slice(0, 6), 'rawBody_len=N/A');
    res.status(400).send('ok');
    return;
  }

  let rawBody: string;
  try {
    rawBody = (await readRawBody(req)).toString('utf8');
  } catch (err) {
    console.error('[webhook] 400 motivo=raw_body_read_fail event.type=N/A header_stripe_signature=', !!req.headers['stripe-signature'], 'webhookSecret_prefix=', webhookSecret ? webhookSecret.slice(0, 6) : '(vazio)', 'rawBody_len=N/A');
    res.status(400).send('ok');
    return;
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[webhook] 400 motivo=invalid_signature event.type=N/A header_stripe_signature=true webhookSecret_prefix=', webhookSecret.slice(0, 6), 'rawBody_len=', rawBody?.length ?? 'N/A', 'err.message=', err instanceof Error ? err.message : String(err));
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
        const subscription = event.data.object as Stripe.Subscription;
        const fullSub = await stripe.subscriptions.retrieve(subscription.id);
        const cpe =
          (fullSub as any).current_period_end ??
          (fullSub as any).items?.data?.[0]?.current_period_end ??
          (fullSub as any).items?.data?.[0]?.current_period_end;
        console.log('[webhook] period_end', { sub: fullSub.id, status: fullSub.status, cancel: fullSub.cancel_at_period_end, cpe });
        const patch: Record<string, any> = {
          stripe_subscription_id: fullSub.id,
          stripe_subscription_status: fullSub.status,
          cancel_at_period_end: !!fullSub.cancel_at_period_end,
          plan_status: ['active', 'trialing'].includes(fullSub.status) ? 'active' : 'expired',
        };
        if (cpe != null) {
          patch.current_period_end = new Date(Number(cpe) * 1000).toISOString();
        }
        await updateProfileByStripeSubscriptionId(supabase, fullSub.id, patch);
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
