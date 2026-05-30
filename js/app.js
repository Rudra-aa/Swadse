import { initFirebase } from './firebase.js';
import { hidePageLoader, openModal, closeModal } from './ui.js';
import { loadCart, addToCart, setupCartListeners } from './cart.js';
import { setupAuth, openAuthModal } from './auth.js';
import { setupMenuListener, setupAdminForm, teardownMenuListener } from './menu.js';
import { setupOrderForm, goToCheckoutPage, initiateOrderModal } from './orders.js';
import { initMotion } from './motion.js';
import { initHero3D } from './hero3d.js';

async function bootstrap() {
  await initFirebase();

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

  setupOrderForm();
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

  ['auth-modal', 'order-modal', 'planner-modal'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target.id === id) closeModal(id);
    });
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

  document.getElementById('show-weekly-planner-btn')?.addEventListener('click', () => {
    openModal('planner-modal');
  });

  document.getElementById('close-modal-btn')?.addEventListener('click', () => closeModal('planner-modal'));
}

function setupContactPrompts() {
  document.querySelectorAll('.login-prompt-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal('signin');
    });
  });
}

if (document.getElementById('site-header')) {
  document.addEventListener('DOMContentLoaded', bootstrap);
}

// Legacy global hooks (menu cards use listeners; keep for compatibility)
window.openModal = openModal;
window.closeModal = closeModal;
