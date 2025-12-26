// app/payu/success/route.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Adjust this to your backend (server-side) URL. Use an env var in prod.
const BACKEND_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8080';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET; // must be set

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

  // application/x-www-form-urlencoded or fallback
  const text = await req.text();
  if (!text) return {};
  return Object.fromEntries(new URLSearchParams(text).entries());
}

/**
 * POST handler: forward payload to backend controller, then redirect browser to client page.
 */
export async function POST(req) {
  try {
    const params = await parseParams(req);

    // Build form body to send to backend (application/x-www-form-urlencoded)
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      // Ensure only strings are sent
      body.append(k, v == null ? '' : String(v));
    }

    // If you want idempotency header from incoming header, forward it too:
    const incomingIdemp = req.headers.get('x-idempotency-key');
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    if (incomingIdemp) headers['X-Idempotency-Key'] = incomingIdemp;

    // Backend endpoint that accepts the form (your controller)
    const backendUrl = `${BACKEND_BASE}/v1/payments/success/app`;

    // Call backend server-side (await so idempotent logic runs before redirect)
    let backendRes;
    try {
      backendRes = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: body.toString(),
      });
      console.log("Response of webhook: ", JSON.stringify(backendRes));
    } catch (fetchErr) {
      // network error calling backend — log and continue to redirect so user isn't stuck
      console.error('[payu-bridge] error calling backend', fetchErr);
      // still redirect client to success page (you may want to redirect to an error page instead)
      const origin = new URL(req.url).origin;
      const qs = new URLSearchParams(params).toString();
      const redirectAbsolute = `${origin}/payment/failure${qs ? `?${qs}` : ''}`;
      return NextResponse.redirect(redirectAbsolute, 303);
    }

    // Optionally inspect backend response
    if (!backendRes.ok) {
      const text = await backendRes.text().catch(() => '<no-body>');
      console.error('[payu-bridge] backend returned non-2xx', backendRes.status, text);
      // You can decide to abort/return an error here. We'll still redirect user to success page.
    } else {
      // backend responded OK
      console.info('[payu-bridge] backend processed webhook ok, status=', backendRes.status);
    }

    // Redirect browser to client success page (preserve params as query if you want)
    const origin = new URL(req.url).origin;
    const qs = new URLSearchParams(params).toString();
    const redirectAbsolute = `${origin}/payment/failure${qs ? `?${qs}` : ''}`;

    return NextResponse.redirect(redirectAbsolute, 303);
  } catch (err) {
    console.error('PayU POST error (bridge)', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Do NOT export GET here — let Next serve the client page at /payment/success on GET.