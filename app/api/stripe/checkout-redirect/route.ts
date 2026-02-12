import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSubscriberByEmail, isDatabaseAvailable } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

// GET handler so email links can trigger checkout (emails can't POST)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.redirect('https://heavymetalstats.com?error=missing-email');
  }

  if (!isDatabaseAvailable()) {
    return NextResponse.redirect('https://heavymetalstats.com?error=unavailable');
  }

  try {
    const subscriber = await getSubscriberByEmail(email);
    if (!subscriber) {
      return NextResponse.redirect('https://heavymetalstats.com?error=not-found');
    }

    if (subscriber.subscription_status === 'paid') {
      return NextResponse.redirect('https://heavymetalstats.com?subscribed=already');
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.redirect('https://heavymetalstats.com?error=config');
    }

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

    if (session.url) {
      return NextResponse.redirect(session.url);
    }

    return NextResponse.redirect('https://heavymetalstats.com?error=checkout');
  } catch (error) {
    console.error('Checkout redirect error:', error);
    return NextResponse.redirect('https://heavymetalstats.com?error=checkout');
  }
}
