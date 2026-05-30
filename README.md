# SwaadSe.in — Authentic Home Kitchen

Production-ready static web app for **SwaadSe.in**: homemade meals, daily menu, subscription plans, cart, Firebase Auth, Firestore orders, and Razorpay checkout (with server-side verification).

## Features

- Email/password and Google sign-in
- Live Firestore menu with admin item management
- Shopping cart and subscription plan selection
- Checkout flow with Razorpay (or COD fallback without keys)
- Success / failure pages, order & payment records in Firestore
- Premium UI: glass panels, GSAP scroll motion, optional Three.js hero
- SEO meta tags, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`
- Accessibility: focus states, ARIA on modals and controls

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | HTML, CSS, ES modules |
| Auth & DB | Firebase Auth, Cloud Firestore |
| Payments | Razorpay Checkout + serverless signature verify |
| Motion | GSAP + ScrollTrigger (CDN) |
| 3D | Three.js (lazy-loaded module) |

## Folder structure

```
├── index.html              # Main landing + menu + pricing
├── checkout.html           # Payment & delivery form
├── success.html / failure.html
├── swadse-premium.css      # Premium UI layer
├── config/
│   ├── env.sample.js       # Template (committed)
│   └── env.js              # Generated/local (gitignored)
├── js/
│   ├── app.js              # Bootstrap
│   ├── config.js           # Config reader
│   ├── firebase.js         # Firebase init (analytics-safe)
│   ├── auth.js             # Sign-in, sign-up, Google
│   ├── cart.js             # Cart state
│   ├── menu.js             # Menu listener & admin form
│   ├── orders.js           # Order modal & checkout redirect
│   ├── checkout-page.js    # Checkout page only
│   ├── motion.js           # GSAP & particles
│   └── hero3d.js           # Three.js hero
├── api/
│   └── verify-payment.js   # Razorpay HMAC verify (serverless)
├── scripts/build-env.mjs   # .env → config/env.js
├── firestore.rules
├── .env.example
└── package.json
```

## Installation

```bash
git clone <your-repo-url>
cd Swadse
cp .env.example .env
# Fill .env (see below)
npm run build:env
npm run serve
# Open http://localhost:3000
```

If `config/env.js` is missing, copy `config/env.sample.js` to `config/env.js` and fill Firebase public keys.

## Environment setup

Copy `.env.example` to `.env`:

| Variable | Where used | Notes |
|----------|------------|--------|
| `FIREBASE_*` | `config/env.js` → browser | Public client config; restrict domains in Firebase Console |
| `PAYMENT_PUBLIC_KEY` | Checkout (Razorpay `key`) | `rzp_test_` or `rzp_live_` |
| `PAYMENT_SECRET_KEY` | **Server only** (`api/verify-payment`) | Never in frontend |
| `APP_ENV` | Config flag | `production` / `development` |
| `ADMIN_EMAILS` | Client admin bootstrap | Comma-separated |

```bash
npm run build:env   # writes config/env.js from .env
```

## Firebase setup

1. Create a Firebase project → add a **Web** app.
2. Enable **Authentication**: Email/Password and Google (add authorized domains).
3. Create **Firestore** database.
4. Deploy rules: `firebase deploy --only firestore:rules` (use `firestore.rules` in this repo).
5. Add menu documents under:  
   `artifacts/default-app-id/public/data/menu/{docId}`  
   Fields: `name`, `description`, `price`, `image`.

Collections used:

- `users/{uid}` — profile & role
- `subscriptions/{uid}` — active meal plan
- `payments/{orderId}` — payment lifecycle
- `artifacts/default-app-id/orders/{orderId}` — orders

## Payment setup

1. Create a [Razorpay](https://razorpay.com) account.
2. Put **Key ID** in `.env` as `PAYMENT_PUBLIC_KEY`, run `npm run build:env`.
3. Put **Key Secret** in hosting env as `PAYMENT_SECRET_KEY` (Vercel/Netlify/Firebase Functions).
4. Deploy `api/verify-payment.js` as a serverless function.
5. Extend the function with **Firebase Admin SDK** to set `paymentStatus: 'paid'` on orders (template included as TODO).

Without Razorpay keys, checkout still completes orders as **pending / COD** for testing.

## Deployment

### Static hosting (Firebase Hosting, Netlify, Vercel)

1. `npm run build:env` in CI using secrets.
2. Publish all files except `.env` and `config/env.js` (generate `env.js` in CI).
3. Deploy `api/verify-payment` on Vercel with `PAYMENT_SECRET_KEY`.

### Firebase Hosting example

```bash
npm install -g firebase-tools
firebase login
firebase init hosting firestore
firebase deploy
```

### Security notes

See **[SECURITY.md](SECURITY.md)** for the full policy and incident response.

- **Never** commit `.env`, `config/env.js`, or `PAYMENT_SECRET_KEY`.
- Contact email/phone are loaded from `.env` and shown **only after sign-in**.
- Fake Google account chooser removed — real Firebase Google sign-in only.
- Firebase API keys are public by design; lock down with App Check and domain restrictions.
- Payment verification **must** run server-side; the client only opens Razorpay UI.

### After cloning (required)

```bash
cp .env.example .env
# Fill Firebase + optional Razorpay + CONTACT_EMAIL / CONTACT_PHONE
npm run build:env
```

### If keys were ever on GitHub

1. Run `bash scripts/purge-git-history.sh` (rewrites history) **or** create a fresh repo.
2. **Rotate** Firebase API key, Razorpay keys, and any Gemini keys in [Google Cloud Console](https://console.cloud.google.com/).
3. `firebase deploy --only firestore:rules`
4. Enable **App Check** and **authorized domains** in Firebase Console.

## Performance

- Three.js and GSAP load from CDN; hero pauses when off-screen.
- Images use `loading="lazy"` on menu cards.
- `prefers-reduced-motion` disables heavy animation.
- Target Lighthouse 90+: test with production build, compressed images, and limited third-party scripts.

## License

© 2026 SwaadSe. All rights reserved. See `LICENSE.md`.

---

Made with care for homemade food lovers.
