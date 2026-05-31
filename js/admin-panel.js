import { collection, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getFirebase, appId } from './firebase.js';
import { getCurrentUserRole } from './auth.js';

let ordersLoaded = false;

export async function setupAdminDashboard() {
  if (getCurrentUserRole() !== 'admin') return;

  const panel = document.getElementById('admin-panel');
  if (panel) panel.style.display = 'block';

  await loadAdminOrders();
  setupOrderStatusButtons();
}

async function loadAdminOrders() {
  const container = document.getElementById('admin-orders-list');
  if (!container || ordersLoaded) return;

  const { db } = getFirebase();
  if (!db) return;

  container.innerHTML = '<p class="admin-loading">Loading orders…</p>';

  try {
    const ordersRef = collection(db, 'artifacts', appId, 'orders');
    const snap = await getDocs(ordersRef);
    const docs = snap.docs.sort(
      (a, b) => (b.data().createdAt || '').localeCompare(a.data().createdAt || '')
    );

    if (snap.empty) {
      container.innerHTML = '<p class="admin-empty">No orders yet.</p>';
      return;
    }

    container.innerHTML = docs.slice(0, 50)
      .map((d) => {
        const o = d.data();
        const items = (o.items || []).map((i) => `${i.name} ×${i.qty}`).join(', ');
        return `
        <article class="admin-order-card" data-order-id="${d.id}">
          <div class="admin-order-card__head">
            <strong>${escape(o.customerName || 'Customer')}</strong>
            <span class="admin-order-status admin-order-status--${o.status || 'pending'}">${o.status || 'pending'}</span>
          </div>
          <p class="admin-order-meta">${escape(o.customerPhone || '')} · ${escape(o.customerEmail || '')}</p>
          <p class="admin-order-items">${escape(items)}</p>
          <div class="admin-order-card__foot">
            <span>₹${o.total ?? 0}</span>
            <span>${formatDate(o.createdAt)}</span>
          </div>
          <div class="admin-order-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-status="confirmed">Confirm</button>
            <button type="button" class="btn btn-ghost btn-sm" data-status="delivered">Delivered</button>
            <button type="button" class="btn btn-ghost btn-sm" data-status="cancelled">Cancel</button>
          </div>
        </article>`;
      })
      .join('');

    ordersLoaded = true;
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="admin-empty">Could not load orders. Check Firestore rules.</p>';
  }
}

function setupOrderStatusButtons() {
  document.getElementById('admin-orders-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn || getCurrentUserRole() !== 'admin') return;

    const card = btn.closest('.admin-order-card');
    const orderId = card?.dataset.orderId;
    const status = btn.dataset.status;
    if (!orderId || !status) return;

    const { db } = getFirebase();
    if (!db) return;

    btn.disabled = true;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'orders', orderId), {
        status,
        updatedAt: new Date().toISOString(),
      });
      card.querySelector('.admin-order-status').textContent = status;
      card.querySelector('.admin-order-status').className = `admin-order-status admin-order-status--${status}`;
    } catch (err) {
      console.error(err);
      alert('Failed to update order status.');
    } finally {
      btn.disabled = false;
    }
  });
}

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function resetAdminDashboard() {
  ordersLoaded = false;
}
