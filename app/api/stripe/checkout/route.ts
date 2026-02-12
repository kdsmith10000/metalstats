import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSubscriberByEmail, isDatabaseAvailable } from '@/lib/db';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Verify subscriber exists
    const subscriber = await getSubscriberByEmail(email);
    if (!subscriber) {
      return NextResponse.json({ error: 'No subscription found for this email. Please sign up first.' }, { status: 404 });
    }

    // If already paid, no need for checkout
    if (subscriber.subscription_status === 'paid') {
      return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 400 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error('STRIPE_PRICE_ID not set');
      return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email.toLowerCase().trim(),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'https://heavymetalstats.com?subscribed=true',
      cancel_url: 'https://heavymetalstats.com?subscribed=cancelled',
      metadata: {
        subscriber_email: email.toLowerCase().trim(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
