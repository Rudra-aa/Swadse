/**
 * Runtime configuration — populated by config/env.js (from .env via npm run build:env).
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
    adminEmails: c.adminEmails?.length ? c.adminEmails : ['arjunthakurr420@gmail.com'],
  };
}

export function getAdminEmails() {
  return getConfig().adminEmails.map((e) => e.toLowerCase().trim()).filter(Boolean);
}

export function isFirebaseConfigured() {
  const { firebase } = getConfig();
  return Boolean(firebase.apiKey && firebase.projectId && firebase.appId);
}

export function assertFirebaseConfig() {
  if (!isFirebaseConfigured()) {
    console.warn('[Swadse] Firebase not configured — copy config/env.example.js to config/env.js');
    return false;
  }
  return true;
}
