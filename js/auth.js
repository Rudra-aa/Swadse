import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getFirebase } from './firebase.js';
import { getConfig } from './config.js';
import { showToast, openModal, closeModal } from './ui.js';
import { setCartUser, loadCart, clearCart } from './cart.js';

const ADMIN_EMAILS = (typeof window !== 'undefined' && window.__SWADSE_CONFIG__?.adminEmails) || [
  'admin@swadse.in',
];

let authMode = 'signin';
let currentUser = null;
let currentUserRole = 'user';
let onUserChange = null;

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentUserRole() {
  return currentUserRole;
}

export async function checkUserRole(uid, email) {
  const { db } = getFirebase();
  if (!db) return 'user';

  try {
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      currentUserRole = 'admin';
      return 'admin';
    }
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      currentUserRole = userDoc.data().role || 'user';
      return currentUserRole;
    }
  } catch (err) {
    console.warn('[Swadse] Role check:', err);
  }
  currentUserRole = 'user';
  return 'user';
}

export function openAuthModal(mode = 'signin') {
  setAuthModeUI(mode);
  resetAuthForm();
  openModal('auth-modal');
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setAuthMessage(message, type = 'error') {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback ${type}`;
}

function clearAuthMessage() {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = '';
  el.className = 'form-feedback';
}

export function setAuthModeUI(mode) {
  authMode = mode;
  const titleMain = document.getElementById('auth-title-main');
  const subtitle = document.getElementById('auth-subtitle');
  const authSubmitText = document.getElementById('auth-submit-text');
  const togglePrompt = document.getElementById('toggle-prompt');
  const toggleText = document.getElementById('toggle-text');

  if (mode === 'signin') {
    if (titleMain) titleMain.textContent = 'Welcome Back';
    if (subtitle) subtitle.textContent = 'Sign in to your SwaadSe account';
    if (authSubmitText) authSubmitText.textContent = 'Sign In';
    if (togglePrompt) togglePrompt.textContent = "Don't have an account?";
    if (toggleText) toggleText.textContent = 'Create one';
    document.getElementById('confirm-password-field')?.classList.add('hidden');
    document.getElementById('terms-field')?.classList.add('hidden');
    document.getElementById('remember-me-field')?.classList.remove('hidden');
    document.getElementById('forgot-password-link')?.classList.remove('hidden');
  } else {
    if (titleMain) titleMain.textContent = 'Join Us';
    if (subtitle) subtitle.textContent = 'Create your SwaadSe account';
    if (authSubmitText) authSubmitText.textContent = 'Create Account';
    if (togglePrompt) togglePrompt.textContent = 'Already have an account?';
    if (toggleText) toggleText.textContent = 'Sign in';
    document.getElementById('confirm-password-field')?.classList.remove('hidden');
    document.getElementById('terms-field')?.classList.remove('hidden');
    document.getElementById('remember-me-field')?.classList.add('hidden');
    document.getElementById('forgot-password-link')?.classList.add('hidden');
  }
  clearAuthMessage();
}

function resetAuthForm() {
  document.getElementById('auth-form')?.reset();
  clearAuthMessage();
}

export async function handleSignOut() {
  const { auth } = getFirebase();
  if (!auth) return;
  try {
    await signOut(auth);
    showToast('Signed out successfully', 'success');
  } catch {
    showToast('Unable to sign out. Please try again.', 'error');
  }
}

export function setUserUI(user) {
  const userActions = document.getElementById('user-actions');
  const signInBtn = document.getElementById('sign-in-btn');
  const menuSigninPrompt = document.getElementById('menu-signin-prompt');
  const menuContainer = document.getElementById('menu-container');
  const userEmailDisplay = document.getElementById('user-email');
  const adminPanel = document.getElementById('admin-panel');
  const mobileSignIn = document.getElementById('mobile-sign-in');
  const mobileUserActions = document.getElementById('mobile-user-actions');
  const mobileUserEmail = document.getElementById('mobile-user-email');

  if (user) {
    userActions?.classList.add('visible');
    signInBtn?.classList.add('hidden');
    menuSigninPrompt?.classList.add('hidden');
    menuContainer?.classList.remove('hidden');

    const label = user.email || user.displayName || 'Logged in';
    if (userEmailDisplay) {
      userEmailDisplay.textContent = label;
      userEmailDisplay.classList.remove('hidden');
    }
    mobileSignIn?.classList.add('hidden');
    mobileUserActions?.classList.remove('hidden');
    if (mobileUserEmail) mobileUserEmail.textContent = label;
    if (adminPanel) adminPanel.style.display = currentUserRole === 'admin' ? 'block' : 'none';
    revealContactDetails(true);
    loadCart();
  } else {
    userActions?.classList.remove('visible');
    signInBtn?.classList.remove('hidden');
    menuSigninPrompt?.classList.remove('hidden');
    menuContainer?.classList.add('hidden');
    userEmailDisplay?.classList.add('hidden');
    mobileSignIn?.classList.remove('hidden');
    mobileUserActions?.classList.add('hidden');
    if (adminPanel) adminPanel.style.display = 'none';
    revealContactDetails(false);
    clearCart();
  }
}

function revealContactDetails(show) {
  const { contactEmail, contactPhone } = getConfig();
  const emailDisplay = document.getElementById('email-display');
  const emailActual = document.getElementById('email-actual');
  const phoneDisplay = document.getElementById('phone-display');
  const phoneActual = document.getElementById('phone-actual');

  if (show && contactEmail) {
    emailDisplay?.classList.add('hidden');
    emailActual?.classList.remove('hidden');
    const el = document.getElementById('contact-email-value');
    if (el) el.textContent = contactEmail;
  } else if (!show) {
    emailDisplay?.classList.remove('hidden');
    emailActual?.classList.add('hidden');
  }

  if (show && contactPhone) {
    phoneDisplay?.classList.add('hidden');
    phoneActual?.classList.remove('hidden');
    const el = document.getElementById('contact-phone-value');
    if (el) el.textContent = contactPhone;
  } else if (!show) {
    phoneDisplay?.classList.remove('hidden');
    phoneActual?.classList.add('hidden');
  }
}

export function setupAuth({ onAuthenticated }) {
  onUserChange = onAuthenticated;
  const { auth, googleProvider } = getFirebase();
  if (!auth) {
    console.warn('[Swadse] Auth unavailable — check config/env.js');
    setupAuthUIOnly();
    return;
  }

  setupAuthForm(auth);
  setupGoogleSignIn(auth, googleProvider);
  setupAuthListeners();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    setCartUser(user);

    if (user) {
      await checkUserRole(user.uid, user.email);
      const { db } = getFirebase();
      if (db && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        await setDoc(
          doc(db, 'users', user.uid),
          { email: user.email, role: 'admin', updatedAt: new Date().toISOString() },
          { merge: true }
        );
        currentUserRole = 'admin';
      }
      setUserUI(user);
      closeModal('auth-modal');
      onUserChange?.(user);
    } else {
      currentUserRole = 'user';
      setUserUI(null);
      onUserChange?.(null);
    }
  });
}

function setupAuthUIOnly() {
  setupAuthListeners();
  setAuthModeUI('signin');
}

function setupAuthForm(auth) {
  const authForm = document.getElementById('auth-form');
  if (!authForm) return;

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { db } = getFirebase();

    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const submitBtn = document.getElementById('auth-submit');
    const loader = document.getElementById('auth-submit-loader');
    const submitText = document.getElementById('auth-submit-text');

    if (!email || !password) {
      setAuthMessage('Please fill in all required fields', 'error');
      return;
    }
    if (!validateEmail(email)) {
      setAuthMessage('Please enter a valid email', 'error');
      return;
    }

    if (authMode === 'signup') {
      const confirm = document.getElementById('confirm-password')?.value;
      if (password !== confirm) {
        setAuthMessage('Passwords do not match', 'error');
        return;
      }
      if (password.length < 6) {
        setAuthMessage('Password must be at least 6 characters', 'error');
        return;
      }
      if (!document.getElementById('agree-terms')?.checked) {
        setAuthMessage('Please agree to Terms of Service', 'error');
        return;
      }
    }

    submitBtn.disabled = true;
    submitText?.classList.add('hidden');
    loader?.classList.remove('hidden');

    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;
        if (user && db) {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              email,
              role: ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
        setAuthMessage('Account created!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setAuthMessage('Welcome back!', 'success');
      }
      setTimeout(() => {
        closeModal('auth-modal');
        resetAuthForm();
        setAuthModeUI('signin');
      }, 800);
    } catch (error) {
      const messages = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/email-already-in-use': 'Email already registered. Sign in instead.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      };
      setAuthMessage(messages[error.code] || 'Authentication failed. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitText?.classList.remove('hidden');
      loader?.classList.add('hidden');
    }
  });
}

function setupGoogleSignIn(auth, googleProvider) {
  document.getElementById('google-login-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    clearAuthMessage();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      showToast(`Welcome, ${result.user.displayName || 'there'}!`, 'success');
      closeModal('auth-modal');
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') return;
      if (error.code === 'auth/popup-blocked') {
        setAuthMessage('Popup blocked. Allow popups for this site and try again.', 'error');
        return;
      }
      setAuthMessage('Google sign-in failed. Please try again.', 'error');
    }
  });
}

function setupAuthListeners() {
  const openSignIn = (e) => {
    e.preventDefault();
    openAuthModal('signin');
  };

  document.getElementById('sign-in-btn')?.addEventListener('click', openSignIn);
  document.getElementById('mobile-sign-in')?.addEventListener('click', openSignIn);
  document.getElementById('menu-signin')?.addEventListener('click', openSignIn);

  document.getElementById('close-auth-modal')?.addEventListener('click', () => {
    closeModal('auth-modal');
    resetAuthForm();
    setAuthModeUI('signin');
  });

  document.getElementById('toggle-auth')?.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthModeUI(authMode === 'signin' ? 'signup' : 'signin');
    resetAuthForm();
  });

  document.getElementById('sign-out-btn')?.addEventListener('click', handleSignOut);
  document.getElementById('mobile-sign-out')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobile-menu')?.classList.remove('open');
    handleSignOut();
  });
}
