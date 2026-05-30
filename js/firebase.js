import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js';
import { getConfig, assertFirebaseConfig } from './config.js';

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

export const appId = 'default-app-id';

export function getFirebase() {
  return { app, auth, db, googleProvider };
}

export async function initFirebase() {
  if (!assertFirebaseConfig()) {
    return { auth: null, db: null, googleProvider: null };
  }

  const firebaseConfig = { ...getConfig().firebase };

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScopes(['profile', 'email']);

    await setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[Swadse] Auth persistence:', err?.code || err);
    });

    try {
      if (await isSupported()) {
        getAnalytics(app);
      }
    } catch {
      /* Analytics blocked (ad blockers, file://, privacy mode) — non-fatal */
    }
  } catch (err) {
    console.error('[Swadse] Firebase init failed:', err);
    app = null;
    auth = null;
    db = null;
  }

  return { auth, db, googleProvider };
}
