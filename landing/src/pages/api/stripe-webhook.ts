import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { generateKey, storeKey } from './_license';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;

    if (email) {
      const key = generateKey();
      await storeKey(key, email);

      // Store the key on the session metadata so the success page can retrieve it
      await stripe.checkout.sessions.update(session.id, {
        metadata: { license_key: key },
      });
    }
  }

  return new Response('ok', { status: 200 });
};
