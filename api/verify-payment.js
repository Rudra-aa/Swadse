/**
 * Vercel / Netlify serverless — verifies Razorpay signature.
 * Set PAYMENT_SECRET_KEY in deployment environment (never in frontend).
 */
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.PAYMENT_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: 'Payment verification not configured' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // TODO: mark order paid in Firestore via Admin SDK (server-side only)
  return res.status(200).json({ ok: true, orderId });
}
