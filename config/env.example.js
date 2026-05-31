/**
 * Public Firebase web config (safe to commit).
 * Copy to config/env.js:  cp config/env.example.js config/env.js
 * Or fill .env and run: npm run build:env
 */
window.__SWADSE_CONFIG__ = {
  appEnv: 'development',
  firebase: {
    apiKey: 'AIzaSyDUzxbFYmIsvuueslhdzZ4bDQKAMAULZE0',
    authDomain: 'swadse-dc052.firebaseapp.com',
    projectId: 'swadse-dc052',
    storageBucket: 'swadse-dc052.firebasestorage.app',
    messagingSenderId: '967105089591',
    appId: '1:967105089591:web:be6f1474c3100559c66fb2',
    measurementId: 'G-RDTXCKKMWK',
  },
  razorpayKeyId: '',
  paymentVerifyUrl: '/api/verify-payment',
  adminEmails: ['arjunthakurr420@gmail.com'],
  contactEmail: '',
  contactPhone: '',
  siteUrl: 'http://127.0.0.1:5509',
};
