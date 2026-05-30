import { collection, onSnapshot, addDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getFirebase, appId } from './firebase.js';
import { getCurrentUserRole } from './auth.js';
import { addToCart } from './cart.js';
import { showToast } from './ui.js';

let unsubscribeMenuListener = null;

const FORBIDDEN = ['samosa', 'shahee paneer', 'shahi paneer'];

export function teardownMenuListener() {
  if (unsubscribeMenuListener) {
    unsubscribeMenuListener();
    unsubscribeMenuListener = null;
  }
}

export function setupMenuListener() {
  const { db } = getFirebase();
  if (!db) return;

  teardownMenuListener();

  const menuRef = collection(db, `artifacts/${appId}/public/data/menu`);
  unsubscribeMenuListener = onSnapshot(
    menuRef,
    (snapshot) => {
      const menuContainer = document.getElementById('menu-container');
      if (!menuContainer) return;
      menuContainer.innerHTML = '';

      if (snapshot.empty) {
        menuContainer.innerHTML =
          '<p class="menu-empty">The menu is being prepared. Check back soon!</p>';
        return;
      }

      snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.name && FORBIDDEN.includes(item.name.trim().toLowerCase())) return;

        const card = document.createElement('article');
        card.className = 'menu-card reveal';
        card.innerHTML = `
          <div class="menu-card__media">
            <img src="${item.image || `https://placehold.co/400x300/c77134/ffffff?text=${encodeURIComponent(item.name)}`}"
                 alt="${item.name}" loading="lazy" width="400" height="300" />
          </div>
          <div class="menu-card__body">
            <h3>${item.name}</h3>
            <p>${item.description || ''}</p>
            <div class="menu-card__footer">
              <span class="menu-card__price">₹${item.price}</span>
              <button type="button" class="btn btn-solid btn-sm" data-add-menu="${docSnap.id}">Add to Cart</button>
            </div>
          </div>`;

        card.querySelector('[data-add-menu]')?.addEventListener('click', () => {
          addToCart({ name: item.name, price: Number(item.price), id: docSnap.id });
        });

        menuContainer.appendChild(card);
      });
    },
    () => {
      const menuContainer = document.getElementById('menu-container');
      if (menuContainer) {
        menuContainer.innerHTML =
          '<p class="menu-empty">Could not load menu. Try again later.</p>';
      }
    }
  );
}

export function setupAdminForm() {
  const adminForm = document.getElementById('add-menu-item-form');
  if (!adminForm || getCurrentUserRole() !== 'admin') return;

  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { db } = getFirebase();
    if (!db || getCurrentUserRole() !== 'admin') {
      showToast('Access denied', 'error');
      return;
    }

    const submitBtn = document.getElementById('submit-menu-item');
    const original = submitBtn?.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      const name = adminForm.itemName.value.trim();
      const description = adminForm.itemDescription.value.trim();
      const price = Number(adminForm.itemPrice.value);
      const image = adminForm.itemImage.value.trim();

      if (!name || !description || !price || !image) {
        showToast('Please fill all fields', 'error');
        return;
      }

      await addDoc(collection(db, `artifacts/${appId}/public/data/menu`), {
        name,
        description,
        price,
        image: image.replace(/ /g, '+'),
      });

      adminForm.reset();
      showToast('Menu item added!', 'success');
    } catch {
      showToast('Error adding item. Check Firestore rules.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });
}
