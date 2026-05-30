# Security Policy

## Reporting a vulnerability

If you discover a security issue, **do not** open a public GitHub issue with exploit details.

Email the maintainers privately (use the contact address configured for the production site). Include steps to reproduce and impact.

We aim to respond within **72 hours**.

## What must never be committed

- `.env` and `config/env.js` (generated locally / in CI)
- `PAYMENT_SECRET_KEY` (Razorpay secret — server only)
- Firebase **Admin** SDK JSON or service account keys
- `script.js.backup` or any file containing API keys
- Real customer data exports

## Public vs secret

| Safe in browser (`config/env.js`) | Server-only |
|-----------------------------------|-------------|
| Firebase web `apiKey`, `projectId`, etc. | `PAYMENT_SECRET_KEY` |
| Razorpay **Key ID** (`rzp_test_` / `rzp_live_`) | Payment signature verification |
| Public contact email/phone (optional) | Firebase Admin SDK |

Firebase web keys are not secret, but must be paired with:

- Strict **Firestore security rules** (see `firestore.rules`)
- **Authentication** on all writes
- **Authorized domains** in Firebase Console
- **Firebase App Check** (recommended)

## If keys were exposed on GitHub

1. **Rotate** Firebase web API key and restrict by HTTP referrer.
2. **Rotate** Razorpay keys if a live secret was committed.
3. **Rotate** any Gemini or third-party API keys in old commits.
4. Purge git history (`scripts/purge-git-history.sh`) or migrate to a fresh repo.
5. Enable GitHub **secret scanning** on the repository.

## Deployment checklist

- [ ] `npm run build:env` in CI from secrets, not committed files
- [ ] `firebase deploy --only firestore:rules`
- [ ] Auth authorized domains = production host only
- [ ] App Check enabled
- [ ] `api/verify-payment` deployed with `PAYMENT_SECRET_KEY`
