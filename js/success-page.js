function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getConfig() {
  return window.__SWADSE_CONFIG__ || {};
}

function getDeliveryTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function initSuccessPage() {
  const orderId = getParam('orderId') || `SWD-${Date.now()}`;
  const paymentId = getParam('paymentId');
  const type = getParam('type');

  document.getElementById('order-id').textContent = orderId;
  document.getElementById('delivery-time').textContent = getDeliveryTime();

  const statusEl = document.getElementById('payment-status');
  if (statusEl) {
    if (paymentId) {
      statusEl.textContent = 'Paid (verified)';
      statusEl.style.color = '#16a34a';
    } else if (type === 'order') {
      statusEl.textContent = 'Pending — pay on delivery / confirm via WhatsApp';
      statusEl.style.color = '#b45309';
    } else {
      statusEl.textContent = 'Pending confirmation';
      statusEl.style.color = '#7a5c40';
    }
  }

  const cfg = getConfig();
  const help = document.getElementById('contact-help');
  if (help) {
    const phone = cfg.contactPhone ? `📞 ${cfg.contactPhone}<br>` : '';
    const email = cfg.contactEmail ? `📧 ${cfg.contactEmail}<br>` : '';
    help.innerHTML = `${phone}${email}📍 Kitchen: DD Nagar, Gwalior, MP 474001`;
  }
}

if (document.getElementById('order-id')) {
  document.addEventListener('DOMContentLoaded', initSuccessPage);
}
