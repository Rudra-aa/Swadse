import { initFirebase } from './firebase.js';
import { hidePageLoader, openModal, closeModal, showToast } from './ui.js';
import { isFirebaseConfigured } from './config.js';
import { loadCart, addToCart, setupCartListeners } from './cart.js';
import { setupAuth, openAuthModal } from './auth.js';
import { setupMenuListener, setupAdminForm, teardownMenuListener } from './menu.js';
import { goToCheckoutPage } from './orders.js';
import { initMotion } from './motion.js';
import { initHero3D } from './hero3d.js';

async function bootstrap() {
  const { auth } = await initFirebase();

  if (!auth) {
    showConfigBanner();
  }

  loadCart();
  setupAuth({
    onAuthenticated: (user) => {
      if (user) {
        setupMenuListener();
        setupAdminForm();
      } else {
        teardownMenuListener();
      }
    },
  });

  setupCartListeners({ onCheckout: goToCheckoutPage });
  setupPricingListeners();
  setupGlobalUI();
  setupContactPrompts();
  initMotion();
  initHero3D();

  hidePageLoader();

  const returnPath = sessionStorage.getItem('swaadse_return');
  if (returnPath) {
    sessionStorage.removeItem('swaadse_return');
    if (returnPath.includes('checkout')) goToCheckoutPage();
  }
}

function setupPricingListeners() {
  document.querySelectorAll('.pricing-cta').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      const planId = btn.dataset.plan;
      const planName = btn.dataset.planName || btn.closest('.pricing-card')?.querySelector('.pricing-name')?.textContent?.trim();
      const planPrice = parseInt(btn.dataset.planPrice, 10) ||
        parseInt(
          (btn.closest('.pricing-card')?.querySelector('.pricing-amount')?.textContent || '').replace(/[^0-9]/g, ''),
          10
        );

      if (!planName || !planPrice) {
        import('./ui.js').then(({ showToast }) => showToast('Invalid plan data', 'error'));
        return;
      }

      btn.classList.add('pricing-cta--loading');
      btn.disabled = true;

      const added = addToCart({
        name: planName,
        price: planPrice,
        id: planId || `plan-${planName.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'plan',
        qty: 1,
      });

      btn.classList.remove('pricing-cta--loading');
      btn.disabled = false;

      if (added) {
        setTimeout(() => goToCheckoutPage(), 350);
      } else {
        openAuthModal('signin');
      }
    });
  });
}

function setupGlobalUI() {
  const hamburger = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  hamburger?.addEventListener('click', () => mobileMenu?.classList.toggle('open'));
  mobileMenu?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });

  document.getElementById('auth-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') closeModal('auth-modal');
  });

  document.getElementById('lang-select')?.addEventListener('change', function () {
    const hi = this.value === 'hi';
    const aboutEn = document.getElementById('about-en');
    const aboutHi = document.getElementById('about-hi');
    if (aboutEn) aboutEn.style.display = hi ? 'none' : 'block';
    if (aboutHi) aboutHi.style.display = hi ? 'block' : 'none';
  });

  window.togglePricing = (type, el) => {
    const weekly = document.getElementById('weekly-pricing');
    const monthly = document.getElementById('monthly-pricing');
    document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
    (el || event?.target)?.classList?.add('active');

    if (type === 'weekly') {
      weekly.style.display = 'grid';
      monthly.style.display = 'none';
    } else {
      weekly.style.display = 'none';
      monthly.style.display = 'grid';
    }
  };

}

function setupContactPrompts() {
  document.querySelectorAll('.login-prompt-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal('signin');
    });
  });
}

function showConfigBanner() {
  if (document.getElementById('config-banner') || isFirebaseConfigured()) return;
  const banner = document.createElement('div');
  banner.id = 'config-banner';
  banner.setAttribute('role', 'alert');
  banner.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:100001;background:#991b1b;color:#fff;padding:12px 16px;text-align:center;font-size:14px;font-weight:600;';
  banner.textContent =
    'Firebase not configured — copy config/env.example.js to config/env.js then refresh.';
  document.body.prepend(banner);
  document.body.style.paddingTop = '48px';
}

if (document.getElementById('site-header')) {
  document.addEventListener('DOMContentLoaded', bootstrap);
}

// Legacy global hooks (menu cards use listeners; keep for compatibility)
window.openModal = openModal;
window.closeModal = closeModal;
