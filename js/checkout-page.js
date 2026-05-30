/**
 * Checkout page logic — loaded only on checkout.html
 */
import { getConfig } from './config.js';
import { initFirebase } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { appId } from './firebase.js';

const CART_KEY = 'swaadse_cart';

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function renderSummary() {
  const cart = loadCart();
  const summaryItems = document.getElementById('summary-items');
  const totalAmount = document.getElementById('total-amount');
  const payBtn = document.getElementById('pay-btn');

  if (!cart.length) {
    summaryItems.innerHTML =
      '<p class="summary-empty">Your cart is empty. <a href="index.html">Browse plans</a></p>';
    payBtn.disabled = true;
    return 0;
  }

  let total = 0;
  summaryItems.innerHTML = cart
    .map((item) => {
      const line = item.price * item.qty;
      total += line;
      return `<div class="summary-item"><span>${item.name} × ${item.qty}</span><span>₹${line}</span></div>`;
    })
    .join('');

  totalAmount.textContent = `₹${total}`;
  payBtn.disabled = false;
  return total;
}

async function saveOrderPending(user, cart, total, formData) {
  const { db } = await initFirebase();
  if (!db) throw new Error('Database unavailable');

  const orderRef = doc(collection(db, 'artifacts', appId, 'orders'));
  const orderId = orderRef.id;

  await setDoc(orderRef, {
    orderId,
    userId: user.uid,
    items: cart,
    total,
    customerName: formData.name,
    customerPhone: formData.phone,
    customerEmail: formData.email,
    address: formData.address,
    instructions: formData.instructions || '',
    status: 'pending_payment',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, 'payments', orderId), {
    orderId,
    userId: user.uid,
    amount: total,
    currency: 'INR',
    status: 'created',
    createdAt: serverTimestamp(),
  });

  return orderId;
}

async function updateSubscription(user, cart) {
  const { db } = await initFirebase();
  if (!db) return;

  const planItems = cart.filter((i) => i.type === 'plan');
  if (!planItems.length) return;

  const plan = planItems[0];
  await setDoc(
    doc(db, 'subscriptions', user.uid),
    {
      userId: user.uid,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      status: 'active',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function initCheckoutPage() {
  const { auth } = await initFirebase();
  const config = getConfig();

  if (!auth) {
    window.location.href = 'index.html#pricing';
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      sessionStorage.setItem('swaadse_return', 'checkout.html');
      window.location.href = 'index.html';
      return;
    }

    const emailField = document.getElementById('email');
    const nameField = document.getElementById('name');
    if (emailField && user.email) emailField.value = user.email;
    if (nameField && user.displayName) nameField.value = user.displayName;

    renderSummary();
  });

  renderSummary();

  document.getElementById('checkout-form')?.addEventListener('submit', (e) => e.preventDefault());

  document.getElementById('pay-btn')?.addEventListener('click', async () => {
    const form = document.getElementById('checkout-form');
    if (!form.reportValidity()) return;

    const cart = loadCart();
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (!total) return;

    const user = auth.currentUser;
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    const payBtn = document.getElementById('pay-btn');
    payBtn.disabled = true;
    payBtn.textContent = 'Processing…';

    const formData = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      instructions: form.instructions?.value.trim() || '',
    };

    try {
      const orderId = await saveOrderPending(user, cart, total, formData);
      const keyId = config.razorpayKeyId;

      if (!keyId || typeof Razorpay === 'undefined') {
        /* COD / demo path when Razorpay not configured */
        await updateSubscription(user, cart);
        localStorage.removeItem(CART_KEY);
        window.location.href = `success.html?orderId=${encodeURIComponent(orderId)}&type=order`;
        return;
      }

      const options = {
        key: keyId,
        amount: Math.round(total * 100),
        currency: 'INR',
        name: 'SwaadSe.in',
        description: 'Meal plan & order payment',
        order_id: undefined,
        handler: async function (response) {
          try {
            const verifyUrl = config.paymentVerifyUrl;
            if (verifyUrl) {
              const res = await fetch(verifyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              if (!res.ok) throw new Error('Verification failed');
            }
            await updateSubscription(user, cart);
            localStorage.removeItem(CART_KEY);
            window.location.href = `success.html?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(response.razorpay_payment_id)}`;
          } catch (err) {
            console.error(err);
            window.location.href = `failure.html?orderId=${encodeURIComponent(orderId)}&reason=verify`;
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: '#c05e1e' },
        modal: {
          ondismiss: () => {
            payBtn.disabled = false;
            payBtn.textContent = 'Pay Now';
            window.location.href = `failure.html?orderId=${encodeURIComponent(orderId)}&reason=cancelled`;
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', () => {
        window.location.href = `failure.html?orderId=${encodeURIComponent(orderId)}&reason=failed`;
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      window.location.href = 'failure.html?reason=error';
    } finally {
      payBtn.disabled = false;
      payBtn.textContent = 'Pay Now';
    }
  });
}

// Auto-run on checkout page
if (document.getElementById('checkout-form')) {
  initCheckoutPage();
}
