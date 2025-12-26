// app/payu/success/route.js

import { NextResponse } from 'next/server';

const BACKEND_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8080';

async function parseParams(req) {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const obj = {};
    for (const [k, v] of fd.entries()) {
      obj[k] = v instanceof File ? '' : String(v);
    }
    return obj;
  }
  const text = await req.text();
  if (!text) return {};
  return Object.fromEntries(new URLSearchParams(text).entries());
}

export async function POST(req) {
  try {
    const params = await parseParams(req);

    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      body.append(k, v == null ? '' : String(v));
    }

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    const backendUrl = `${BACKEND_BASE}/v1/payments/success/app`;

    try {
      const backendRes = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: body.toString(),
      });
      console.log("Backend success response:", backendRes.status);
    } catch (fetchErr) {
      console.error('[payu-success] backend call failed', fetchErr);
    }

    // CORRECT REDIRECT — TO SUCCESS PAGE
    const origin = new URL(req.url).origin;
    const qs = new URLSearchParams(params).toString();
    const redirectUrl = `${origin}/payment/success${qs ? `?${qs}` : ''}`;

    return NextResponse.redirect(redirectUrl, 303);
  } catch (err) {
    console.error('PayU success handler error', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}