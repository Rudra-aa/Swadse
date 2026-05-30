import { collection, doc, setDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getFirebase, appId } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { getCart, getCartTotal, clearCart } from './cart.js';
import { showToast, openModal, closeModal } from './ui.js';

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

export function initiateOrderModal() {
  const cart = getCart();
  const user = getCurrentUser();

  if (!cart.length) {
    showToast('Your cart is empty', 'warning');
    return;
  }
  if (!user) {
    showToast('Please sign in to checkout', 'warning');
    openModal('auth-modal');
    return;
  }

  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');

  const orderNameInput = document.getElementById('order-name');
  const orderEmailInput = document.getElementById('order-email');
  if (orderNameInput) orderNameInput.value = user.displayName || user.email || 'Customer';
  if (orderEmailInput) orderEmailInput.value = user.email || '';

  const orderItemsContainer = document.getElementById('order-items');
  if (orderItemsContainer) {
    orderItemsContainer.innerHTML =
      cart
        .map(
          (item) => `
      <div class="order-line">
        <span>${item.name} <strong>×${item.qty}</strong></span>
        <span>₹${item.price * item.qty}</span>
      </div>`
        )
        .join('') +
      `<div class="order-line order-line--total"><span>Total</span><span>₹${getCartTotal()}</span></div>`;
  }

  openModal('order-modal');
}

export function setupOrderForm() {
  const orderForm = document.getElementById('order-form');
  if (!orderForm) return;

  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    const cart = getCart();
    const { db } = getFirebase();

    if (!cart.length || !user || !db) {
      showToast('Please sign in and add items', 'warning');
      return;
    }

    const name = document.getElementById('order-name')?.value.trim();
    const phone = document.getElementById('order-phone')?.value.trim();
    const email = document.getElementById('order-email')?.value.trim();
    const message = document.getElementById('order-message')?.value.trim();

    if (!name || !phone || !email) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      showToast('Enter a valid 10-digit phone number', 'error');
      return;
    }

    const submitBtn = document.getElementById('submit-order');
    const original = submitBtn?.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing Order...';

    try {
      const orderRef = doc(collection(db, 'artifacts', appId, 'orders'));
      const orderId = orderRef.id;
      const total = getCartTotal();

      await setDoc(orderRef, {
        orderId,
        userId: user.uid,
        items: cart.map((i) => ({ name: i.name, price: i.price, qty: i.qty, type: i.type })),
        total,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        instructions: message || '',
        status: 'pending',
        paymentStatus: 'cod',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      clearCart();
      closeModal('order-modal');
      window.location.href = `success.html?orderId=${encodeURIComponent(orderId)}&type=order`;
    } catch (err) {
      console.error(err);
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });
}
