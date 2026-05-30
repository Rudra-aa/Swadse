/**
 * Runtime configuration — populated by config/env.js (from .env via npm run build:env).
 * Never put PAYMENT_SECRET_KEY or Firebase Admin credentials here.
 */
export function getConfig() {
  const c = typeof window !== 'undefined' ? window.__SWADSE_CONFIG__ : {};
  return {
    appEnv: c.appEnv || 'development',
    firebase: c.firebase || {},
    razorpayKeyId: c.razorpayKeyId || '',
    paymentVerifyUrl: c.paymentVerifyUrl || '/api/verify-payment',
    contactEmail: c.contactEmail || '',
    contactPhone: c.contactPhone || '',
    siteUrl: c.siteUrl || '',
  };
}

export function assertFirebaseConfig() {
  const { firebase } = getConfig();
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = required.filter((k) => !firebase[k]);
  if (missing.length) {
    console.warn(
      '[Swadse] Missing Firebase config:',
      missing.join(', '),
      '— copy config/env.sample.js to config/env.js'
    );
    return false;
  }
  return true;
}
