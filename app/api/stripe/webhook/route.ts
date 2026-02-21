import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'crypto';
import { Resend } from 'resend';
import {
  updateSubscriptionStatus,
  createPaidSubscriber,
  getSubscriberByEmail,
} from '@/lib/db';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
  });
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
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
          const existing = await getSubscriberByEmail(email);
          const isNewSubscriber = !existing;

          await createPaidSubscriber(
            email,
            existing?.unsubscribe_token || crypto.randomUUID(),
            customerId || undefined,
            subscriptionId || undefined
          );
          console.log(`Subscription activated for ${email} (new=${isNewSubscriber})`);

          try {
            const subscriber = await getSubscriberByEmail(email);
            const unsubscribeUrl = subscriber
              ? `https://heavymetalstats.com/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`
              : '#';

            await getResend().emails.send({
              from: 'Heavy Metal Stats <newsletter@heavymetalstats.com>',
              to: email.toLowerCase().trim(),
              subject: isNewSubscriber
                ? 'Welcome to Heavy Metal Stats — Subscription Confirmed'
                : 'Payment Confirmed — Your Subscription is Active',
              html: buildPaymentConfirmationEmail(isNewSubscriber, unsubscribeUrl),
            });
          } catch (emailErr) {
            console.error(`Failed to send confirmation email to ${email}:`, emailErr);
          }
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

function buildPaymentConfirmationEmail(isNew: boolean, unsubscribeUrl: string): string {
  const heading = isNew
    ? 'Welcome to Heavy Metal Stats!'
    : 'Payment Confirmed';
  const body = isNew
    ? 'Your subscription is now active. You\'ll receive the Daily Bulletin Analysis every trading day with COMEX risk scores, warehouse data, and market insights delivered to your inbox.'
    : 'Your subscription has been renewed. You\'ll continue receiving the Daily Bulletin Analysis every trading day.';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1e293b;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;color:#0f172a;font-weight:800;letter-spacing:-0.5px;">
                HEAVY METAL STATS
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#f8fafc;font-weight:700;">
                ${heading}
              </h2>
              <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
                ${body}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#0f172a;border-radius:8px;border-left:3px solid #22c55e;">
                    <p style="margin:0;font-size:14px;color:#22c55e;font-weight:600;">
                      &#10003; Subscription active &mdash; $5/month
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
                Your next bulletin arrives after the next CME data update (nightly at 9:30 PM EST, data delayed one day per CME release schedule).
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:8px;">
                    <a href="https://heavymetalstats.com" style="display:inline-block;padding:14px 28px;font-size:14px;color:#0f172a;font-weight:700;text-decoration:none;">
                      View Live Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;color:#475569;">
                Data sourced from CME Group. Informational only &mdash; not financial advice.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
                &nbsp;&bull;&nbsp;
                <a href="https://heavymetalstats.com/privacy" style="color:#64748b;text-decoration:underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
