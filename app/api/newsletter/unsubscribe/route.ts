import { NextResponse } from 'next/server';
import { removeSubscriber, isDatabaseAvailable } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse(getUnsubscribeHtml(false, 'Invalid unsubscribe link.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!isDatabaseAvailable()) {
    return new NextResponse(getUnsubscribeHtml(false, 'Service temporarily unavailable. Please try again later.'), {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    const removed = await removeSubscriber(token);

    if (removed) {
      return new NextResponse(getUnsubscribeHtml(true, 'You have been successfully unsubscribed from the Heavy Metal Stats daily bulletin.'), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return new NextResponse(getUnsubscribeHtml(false, 'This link has already been used or is no longer valid.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new NextResponse(getUnsubscribeHtml(false, 'Something went wrong. Please try again later.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

function getUnsubscribeHtml(success: boolean, message: string): string {
  const icon = success ? '&#10003;' : '&#10007;';
  const iconColor = success ? '#22c55e' : '#ef4444';
  const title = success ? 'Unsubscribed' : 'Error';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Heavy Metal Stats</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #0f172a;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 48px 40px;
      max-width: 480px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 28px;
      font-weight: bold;
      color: white;
      background-color: ${iconColor};
    }
    h1 {
      font-size: 22px;
      color: #f8fafc;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    a.btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #0f172a;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
    }
    a.btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="btn" href="https://heavymetalstats.com">Back to Heavy Metal Stats</a>
  </div>
</body>
</html>`;
}
