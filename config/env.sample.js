/**
 * Copy to config/env.js (gitignored) or run: npm run build:env
 * Only PUBLIC keys belong here. Never add PAYMENT_SECRET_KEY.
 */
window.__SWADSE_CONFIG__ = {
  appEnv: 'development',
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
  },
  razorpayKeyId: '',
  paymentVerifyUrl: '/api/verify-payment',
  adminEmails: ['admin@swadse.in'],
  contactEmail: '',
  contactPhone: '',
  siteUrl: 'https://swaadse.in',
};
