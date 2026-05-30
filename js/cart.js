import { showToast, openModal } from './ui.js';

const CART_KEY = 'swaadse_cart';
let cart = [];
let currentUser = null;

export function setCartUser(user) {
  currentUser = user;
}

export function getCart() {
  return cart;
}

export function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    cart = saved ? JSON.parse(saved) : [];
  } catch {
    cart = [];
  }
  updateCartUI();
}

export function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* quota / private mode */
  }
  updateCartUI();
}

export function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function getCartItemCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

export function clearCart() {
  cart = [];
  saveCart();
}

export function addToCart(item, { requireAuth = true } = {}) {
  if (requireAuth && !currentUser) {
    showToast('Please sign in to add items to cart', 'warning');
    openModal('auth-modal');
    return false;
  }

  const existing = cart.find((c) => c.id === item.id || c.name === item.name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      name: item.name,
      price: item.price,
      qty: item.qty || 1,
      id: item.id || item.name.replace(/\s+/g, '-').toLowerCase(),
      type: item.type || 'item',
    });
  }

  saveCart();
  showToast(`${item.name} added to cart`, 'success');
  return true;
}

export function removeFromCart(itemName) {
  cart = cart.filter((c) => c.name !== itemName);
  saveCart();
  showToast('Item removed from cart', 'success');
}

export function updateCartQuantity(itemName, qty) {
  const item = cart.find((c) => c.name === itemName);
  if (!item) return;
  if (qty <= 0) {
    removeFromCart(itemName);
  } else {
    item.qty = qty;
    saveCart();
  }
}

export function updateCartUI() {
  const cartBadge = document.getElementById('cart-badge');
  const cartTotalAmount = document.getElementById('cart-total');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCheckoutBtn = document.getElementById('cart-checkout-btn');

  const count = getCartItemCount();
  const total = getCartTotal();

  if (cartBadge) {
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
  }

  if (cartTotalAmount) {
    cartTotalAmount.textContent = `₹${total}`;
  }

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon" aria-hidden="true">🛒</div>
        <p>Your cart is empty</p>
        <p class="cart-empty-hint">Add items from the menu or choose a plan</p>
      </div>`;
    if (cartCheckoutBtn) cartCheckoutBtn.style.display = 'none';
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-line" data-item="${encodeURIComponent(item.name)}">
      <div class="cart-line__info">
        <div class="cart-line__name">${escapeHtml(item.name)}</div>
        <div class="cart-line__price">₹${item.price}</div>
      </div>
      <div class="cart-line__qty">
        <button type="button" class="qty-btn" data-action="dec" data-name="${escapeAttr(item.name)}" aria-label="Decrease quantity">−</button>
        <input type="number" value="${item.qty}" min="1" data-name="${escapeAttr(item.name)}" class="qty-input" aria-label="Quantity for ${escapeAttr(item.name)}" />
        <button type="button" class="qty-btn" data-action="inc" data-name="${escapeAttr(item.name)}" aria-label="Increase quantity">+</button>
      </div>
      <button type="button" class="cart-line__remove" data-name="${escapeAttr(item.name)}" aria-label="Remove ${escapeAttr(item.name)}">✕</button>
    </div>`
    )
    .join('');

  if (cartCheckoutBtn) cartCheckoutBtn.style.display = 'block';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

export function toggleCart() {
  document.getElementById('cart-sidebar')?.classList.toggle('open');
  document.getElementById('cart-overlay')?.classList.toggle('open');
}

export function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
}

export function setupCartListeners({ onCheckout }) {
  document.getElementById('cart-checkout-btn')?.addEventListener('click', onCheckout);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('cart-icon')?.addEventListener('click', toggleCart);
  document.getElementById('order-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    onCheckout();
  });

  document.getElementById('cart-items')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action], .cart-line__remove');
    if (!btn) return;
    const name = decodeURIComponent(btn.dataset.name || '');
    const item = cart.find((c) => c.name === name);
    if (!item) return;

    if (btn.classList.contains('cart-line__remove')) {
      removeFromCart(name);
      return;
    }
    if (btn.dataset.action === 'inc') updateCartQuantity(name, item.qty + 1);
    if (btn.dataset.action === 'dec') updateCartQuantity(name, item.qty - 1);
  });

  document.getElementById('cart-items')?.addEventListener('change', (e) => {
    if (!e.target.classList.contains('qty-input')) return;
    const name = decodeURIComponent(e.target.dataset.name || '');
    updateCartQuantity(name, parseInt(e.target.value, 10) || 1);
  });
}
