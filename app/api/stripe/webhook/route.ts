import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateSubscriptionStatus } from '@/lib/db';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.metadata?.subscriber_email;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (email) {
          await updateSubscriptionStatus(
            email,
            'paid',
            customerId || undefined,
            subscriptionId || undefined
          );
          console.log(`Subscription activated for ${email}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;
        if (email) {
          await updateSubscriptionStatus(email, 'paid');
          console.log(`Invoice paid for ${email}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Look up customer email from Stripe
        const customer = await stripe.customers.retrieve(
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
        );
        if (customer && !customer.deleted && 'email' in customer && customer.email) {
          await updateSubscriptionStatus(customer.email, 'cancelled');
          console.log(`Subscription cancelled for ${customer.email}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as Stripe.Invoice;
        const failedEmail = failedInvoice.customer_email;
        if (failedEmail) {
          await updateSubscriptionStatus(failedEmail, 'expired');
          console.log(`Payment failed for ${failedEmail}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
