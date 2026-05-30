#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const outPath = join(root, 'config', 'env.js');

const ENV_KEYS = [
  'APP_ENV',
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_MEASUREMENT_ID',
  'PAYMENT_PUBLIC_KEY',
  'PAYMENT_VERIFY_URL',
  'ADMIN_EMAILS',
  'CONTACT_EMAIL',
  'CONTACT_PHONE',
  'SITE_URL',
];

function parseEnv(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function fromProcessEnv() {
  const env = {};
  for (const key of ENV_KEYS) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function loadEnv() {
  const merged = { ...fromProcessEnv() };
  if (existsSync(envPath)) {
    Object.assign(merged, parseEnv(readFileSync(envPath, 'utf8')), fromProcessEnv());
  }
  return merged;
}

const env = loadEnv();

if (!env.FIREBASE_API_KEY && !env.FIREBASE_PROJECT_ID) {
  console.warn('[build-env] Warning: Firebase vars missing — auth will not work until env is set.');
}

const config = {
  appEnv: env.APP_ENV || 'production',
  firebase: {
    apiKey: env.FIREBASE_API_KEY || '',
    authDomain: env.FIREBASE_AUTH_DOMAIN || '',
    projectId: env.FIREBASE_PROJECT_ID || '',
    storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.FIREBASE_APP_ID || '',
    measurementId: env.FIREBASE_MEASUREMENT_ID || '',
  },
  razorpayKeyId: env.PAYMENT_PUBLIC_KEY || '',
  paymentVerifyUrl: env.PAYMENT_VERIFY_URL || '/api/verify-payment',
  adminEmails: (env.ADMIN_EMAILS || 'admin@swadse.in').split(',').map((s) => s.trim()),
  contactEmail: env.CONTACT_EMAIL || '',
  contactPhone: env.CONTACT_PHONE || '',
  siteUrl: env.SITE_URL || 'https://swaadse.in',
};

mkdirSync(dirname(outPath), { recursive: true });

const file = `/* Auto-generated at build — do not commit */\nwindow.__SWADSE_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;
writeFileSync(outPath, file);
console.log('Wrote config/env.js');
