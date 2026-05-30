import { getCurrentUser } from './auth.js';
import { getCart } from './cart.js';
import { showToast, openModal } from './ui.js';

export function goToCheckoutPage() {
  const cart = getCart();
  if (!cart.length) {
    showToast('Your cart is empty', 'warning');
    return;
  }
  if (!getCurrentUser()) {
    showToast('Please sign in to checkout', 'warning');
    openModal('auth-modal');
    return;
  }
  window.location.href = 'checkout.html';
}
