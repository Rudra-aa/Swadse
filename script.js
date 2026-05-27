import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqm3WSzAPGOQgUAd73bHtKY2VY1dXGj24",
    authDomain: "swaadse-in-website.firebaseapp.com",
    projectId: "swaadse-in-website",
    storageBucket: "swaadse-in-website.appspot.com",
    messagingSenderId: "1013679995805",
    appId: "1:1013679995805:web:10d373362004bb4aec0d74",
    measurementId: "G-JGHV6JWKF7"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize EmailJS
emailjs.init('YOUR_PUBLIC_KEY');

// ═══════════════════════════════════════════════════════════
// GLOBAL VARIABLES & STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════

let currentMenuItems = [];
let unsubscribeMenuListener = null;
let cart = [];
let currentUser = null;

// Cart and UI elements
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const cartIcon = document.getElementById('cart-icon');
const cartClose = document.getElementById('cart-close');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalAmount = document.getElementById('cart-total');
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
const cartBadge = document.getElementById('cart-badge');

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ═══════════════════════════════════════════════════════════
// CART MANAGEMENT
// ═══════════════════════════════════════════════════════════

function loadCart() {
    const saved = localStorage.getItem('swaadse_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('swaadse_cart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(item) {
    if (!currentUser) {
        showToast('Please sign in to add items to cart', 'warning');
        return;
    }

    const existingItem = cart.find(c => c.name === item.name);
    
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({
            name: item.name,
            price: item.price,
            qty: 1,
            id: item.id || item.name.replace(/\s+/g, '-')
        });
    }
    
    saveCart();
    showToast(`${item.name} added to cart! ✓`, 'success');
}

function removeFromCart(itemName) {
    cart = cart.filter(c => c.name !== itemName);
    saveCart();
    showToast('Item removed from cart', 'success');
}

function updateCartQuantity(itemName, qty) {
    const item = cart.find(c => c.name === itemName);
    if (item) {
        if (qty <= 0) {
            removeFromCart(itemName);
        } else {
            item.qty = qty;
            saveCart();
        }
    }
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function getCartItemCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
    const count = getCartItemCount();
    const total = getCartTotal();
    
    // Update badge
    if (count > 0) {
        cartBadge.textContent = count;
        cartBadge.style.display = 'flex';
    } else {
        cartBadge.style.display = 'none';
    }
    
    // Update total
    cartTotalAmount.textContent = `₹${total}`;
    
    // Update items display
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p>Your cart is empty</p>
                <p style="font-size: 12px; margin-top: 8px;">Add items from the menu to get started</p>
            </div>
        `;
        cartCheckoutBtn.style.display = 'none';
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="window.updateQty('${item.name}', ${item.qty - 1})">−</button>
                        <input type="number" class="qty-input" value="${item.qty}" 
                               onchange="window.updateQty('${item.name}', this.value)" min="1">
                        <button class="qty-btn" onclick="window.updateQty('${item.name}', ${item.qty + 1})">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="window.removeItem('${item.name}')">✕</button>
            </div>
        `).join('');
        cartCheckoutBtn.style.display = 'block';
    }
}

// Global functions for inline onclick handlers
window.updateQty = (itemName, qty) => updateCartQuantity(itemName, parseInt(qty));
window.removeItem = (itemName) => removeFromCart(itemName);

function toggleCart() {
    cartSidebar.classList.toggle('open');
    cartOverlay.classList.toggle('open');
}

function closeCart() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
// PAYMENT & CHECKOUT
// ═══════════════════════════════════════════════════════════

async function initiateCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }

    if (!currentUser) {
        showToast('Please sign in to checkout', 'warning');
        return;
    }

    closeCart();
    
    // Get customer details (you can implement a checkout form here)
    const name = currentUser.email || 'Customer';
    const phone = prompt('Enter your phone number:');
    
    if (!phone) {
        showToast('Phone number is required', 'error');
        return;
    }

    const amount = getCartTotal();
    
    // Create order in Firebase first
    try {
        const orderRef = doc(collection(db, 'orders'));
        const orderId = orderRef.id;
        
        const orderData = {
            orderId: orderId,
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                qty: item.qty
            })),
            total: amount,
            customerName: name,
            customerPhone: phone,
            customerEmail: currentUser.email,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        // Save order to Firebase
        await setDoc(orderRef, orderData);

        // Initialize Razorpay
        const options = {
            key: 'rzp_live_Vg9WXXXX', // Replace with your Razorpay key
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            name: 'SwaadSe.in',
            description: 'Food Order',
            order_id: orderId,
            handler: async function(response) {
                // Payment successful
                orderData.status = 'completed';
                orderData.paymentId = response.razorpay_payment_id;
                orderData.razorpayOrderId = response.razorpay_order_id;
                
                await setDoc(orderRef, orderData);
                
                showToast('Payment successful! Order confirmed ✓', 'success');
                cart = [];
                saveCart();
                
                // Redirect to success page
                setTimeout(() => {
                    window.location.href = `/checkout/success?orderId=${orderId}`;
                }, 1500);
            },
            prefill: {
                name: name,
                email: currentUser.email,
                contact: phone
            },
            theme: {
                color: '#c05e1e'
            },
            modal: {
                ondismiss: function() {
                    orderData.status = 'failed';
                    setDoc(orderRef, orderData);
                    showToast('Payment cancelled', 'error');
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Error processing checkout. Please try again.', 'error');
    }
}

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════════════════

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    
    if (user) {
        console.log("User authenticated:", user.uid);
        setupMenuListener();
        setupAdminForm();
        document.getElementById('menu-signin-prompt')?.classList.add('hidden');
        document.getElementById('menu-container')?.classList.remove('hidden');
        document.getElementById('sign-in-btn')?.classList.add('hidden');
        document.getElementById('user-actions')?.classList.remove('hidden');
    } else {
        console.log("No user authenticated");
        document.getElementById('menu-signin-prompt')?.classList.remove('hidden');
        document.getElementById('menu-container')?.classList.add('hidden');
        document.getElementById('user-actions')?.classList.add('hidden');
        document.getElementById('sign-in-btn')?.classList.remove('hidden');
    }
});

// ═══════════════════════════════════════════════════════════
// MENU & DATABASE
// ═══════════════════════════════════════════════════════════

function setupMenuListener() {
    const menuCollectionRef = collection(db, `artifacts/${appId}/public/data/menu`);
    if (unsubscribeMenuListener) {
        unsubscribeMenuListener();
    }
    unsubscribeMenuListener = onSnapshot(menuCollectionRef, (snapshot) => {
        currentMenuItems = [];
        const menuContainer = document.getElementById('menu-container');
        menuContainer.innerHTML = '';

        if (snapshot.empty) {
            menuContainer.innerHTML = `<p class="col-span-full text-center text-[#638792]">The menu for today is being prepared. Please check back soon!</p>`;
            return;
        } 
        
        snapshot.forEach(doc => {
            const item = doc.data();
            const forbidden = ["samosa", "shahee paneer", "shahi paneer"];
            if (item.name && forbidden.includes(item.name.trim().toLowerCase())) {
                return;
            }
            currentMenuItems.push({ ...item, id: doc.id });
            
            const menuItemEl = document.createElement('div');
            menuItemEl.className = "bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300";
            menuItemEl.innerHTML = `
                <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                <img src="https://placehold.co/600x400/c77134/ffffff?text=${item.image}" 
                     onerror="this.onerror=null;this.src='https://placehold.co/600x400/cccccc/333333?text=Food+Image';"
                     alt="${item.name}" class="w-full h-48 object-cover">
                <div class="p-6">
                    <h3 class="text-xl font-bold font-serif text-[#8f5d3b] mb-2">${item.name}</h3>
                    <p class="text-[#638792] mb-4">${item.description}</p>
                    <div class="flex justify-between items-center">
                        <div class="text-2xl font-bold text-[#3c4548]">₹${item.price}</div>
                        <button class="btn btn-solid" style="padding: 8px 16px; font-size: 12px;" 
                                onclick="window.addToCartFromMenu({name: '${item.name}', price: ${item.price}, id: '${doc.id}'})">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
            menuContainer.appendChild(menuItemEl);
        });
        
    }, (error) => {
        console.error("Firestore error:", error);
        const menuContainer = document.getElementById('menu-container');
        menuContainer.innerHTML = `<p class="col-span-full text-center text-red-500">Could not load the menu. Please try again later.</p>`;
    });
}

window.addToCartFromMenu = (item) => addToCart(item);

function setupAdminForm() {
    const adminForm = document.getElementById('add-menu-item-form');
    if (!adminForm) return;

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-menu-item');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
            const menuCollectionRef = collection(db, `artifacts/${appId}/public/data/menu`);
            await addDoc(menuCollectionRef, {
                name: adminForm.itemName.value,
                description: adminForm.itemDescription.value,
                price: Number(adminForm.itemPrice.value),
                image: adminForm.itemImage.value.replace(/ /g, '+')
            });
            adminForm.reset();
            const adminMessage = document.getElementById('admin-message');
            adminMessage.textContent = 'Menu item added successfully!';
            adminMessage.classList.remove('text-red-600');
            adminMessage.classList.add('text-green-600');
        } catch (error) {
            console.error("Error adding document:", error);
            const adminMessage = document.getElementById('admin-message');
            adminMessage.textContent = 'Error adding item. Please check your Firebase rules.';
            adminMessage.classList.remove('text-green-600');
            adminMessage.classList.add('text-red-600');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Item to Menu';
            setTimeout(() => {
                const adminMessage = document.getElementById('admin-message');
                adminMessage.textContent = '';
            }, 3000);
        }
    });
}

// ═══════════════════════════════════════════════════════════
// AUTHENTICATION FORMS & MODALS
// ═══════════════════════════════════════════════════════════

// Sign In Button
const signInBtn = document.getElementById('sign-in-btn');
signInBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('auth-modal')?.classList.remove('hidden');
    document.getElementById('auth-title').textContent = 'Sign In';
    document.getElementById('auth-submit').textContent = 'Sign In';
    document.getElementById('toggle-auth').textContent = "Don't have an account? Sign Up";
    document.getElementById('confirm-password-field')?.classList.add('hidden');
    document.getElementById('password-strength-container')?.classList.add('hidden');
    document.getElementById('remember-me-field')?.classList.remove('hidden');
    document.getElementById('two-fa-field')?.classList.remove('hidden');
});

// Close Auth Modal
const closeAuthModal = document.getElementById('close-auth-modal');
closeAuthModal?.addEventListener('click', () => {
    document.getElementById('auth-modal')?.classList.add('hidden');
    resetAuthForm();
});

// Password visibility toggle
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
togglePasswordBtn?.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
});

// Email validation
document.getElementById('email')?.addEventListener('input', (e) => {
    const email = e.target.value;
    const feedback = document.getElementById('email-feedback');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email === '') {
        feedback.textContent = '';
    } else if (emailRegex.test(email)) {
        feedback.textContent = '✓ Valid email format';
        feedback.style.color = '#16a34a';
    } else {
        feedback.textContent = '✗ Invalid email format';
        feedback.style.color = '#dc2626';
    }
});

// Password strength check
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
}

document.getElementById('password')?.addEventListener('input', (e) => {
    const password = e.target.value;
    const feedback = document.getElementById('password-feedback');
    const strengthContainer = document.getElementById('password-strength-container');
    
    if (password === '') {
        feedback.textContent = '';
        strengthContainer?.classList.add('hidden');
        return;
    }
    
    strengthContainer?.classList.remove('hidden');
    const strength = checkPasswordStrength(password);
    const strengthText = document.getElementById('strength-text');
    const bars = ['strength-bar-1', 'strength-bar-2', 'strength-bar-3', 'strength-bar-4'];
    
    bars.forEach(bar => {
        const el = document.getElementById(bar);
        if (el) el.style.backgroundColor = '#d1d5db';
    });
    
    const strengthLevels = ['Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#dc2626', '#ea580c', '#eab308', '#16a34a'];
    
    for (let i = 0; i < strength; i++) {
        const el = document.getElementById(bars[i]);
        if (el) el.style.backgroundColor = strengthColors[i];
    }
    
    if (strengthText) {
        strengthText.textContent = strengthLevels[strength - 1] || 'Very Weak';
        strengthText.style.color = strengthColors[strength - 1] || '#dc2626';
    }
    
    if (password.length < 8) {
        feedback.textContent = 'At least 8 characters required';
        feedback.style.color = '#dc2626';
    } else if (!password.match(/[a-z]/) || !password.match(/[A-Z]/)) {
        feedback.textContent = 'Mix uppercase and lowercase letters';
        feedback.style.color = '#ea580c';
    } else if (!password.match(/[0-9]/)) {
        feedback.textContent = 'Add numbers for more security';
        feedback.style.color = '#ea580c';
    } else {
        feedback.textContent = '✓ Good password';
        feedback.style.color = '#16a34a';
    }
});

// Auth form submission
let window.isSignUp = false;
const authForm = document.getElementById('auth-form');
authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMessage = document.getElementById('auth-message');
    const submitBtn = document.getElementById('auth-submit');
    
    if (!email || !password) {
        authMessage.textContent = 'Please fill in all required fields';
        authMessage.style.color = '#dc2626';
        return;
    }
    
    if (window.isSignUp) {
        const confirmPassword = document.getElementById('confirm-password').value;
        if (password !== confirmPassword) {
            authMessage.textContent = 'Passwords do not match';
            authMessage.style.color = '#dc2626';
            return;
        }
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = window.isSignUp ? 'Creating account...' : 'Signing in...';
    
    try {
        if (window.isSignUp) {
            await createUserWithEmailAndPassword(auth, email, password);
            authMessage.textContent = 'Account created successfully! 🎉';
            authMessage.style.color = '#16a34a';
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            authMessage.textContent = 'Signed in successfully! Welcome back 👋';
            authMessage.style.color = '#16a34a';
            loadCart();
        }
        setTimeout(() => {
            document.getElementById('auth-modal')?.classList.add('hidden');
            resetAuthForm();
            window.isSignUp = false;
        }, 2000);
    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.style.color = '#dc2626';
        console.error("Auth error:", error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = window.isSignUp ? 'Sign Up' : 'Sign In';
    }
});

// Sign Out
const signOutBtn = document.getElementById('sign-out-btn');
signOutBtn?.addEventListener('click', async () => {
    await signOut(auth);
    cart = [];
    localStorage.removeItem('swaadse_cart');
    document.getElementById('user-actions')?.classList.add('hidden');
    document.getElementById('sign-in-btn')?.classList.remove('hidden');
});

// Toggle auth mode
const toggleAuth = document.getElementById('toggle-auth');
toggleAuth?.addEventListener('click', (e) => {
    e.preventDefault();
    window.isSignUp = !window.isSignUp;
    if (window.isSignUp) {
        document.getElementById('auth-title').textContent = 'Create Account';
        document.getElementById('auth-submit').textContent = 'Sign Up';
        toggleAuth.textContent = 'Already have an account? Sign In';
        document.getElementById('confirm-password-field')?.classList.remove('hidden');
        document.getElementById('password-strength-container')?.classList.remove('hidden');
        document.getElementById('remember-me-field')?.classList.add('hidden');
        document.getElementById('two-fa-field')?.classList.add('hidden');
    } else {
        document.getElementById('auth-title').textContent = 'Sign In';
        document.getElementById('auth-submit').textContent = 'Sign In';
        toggleAuth.textContent = "Don't have an account? Sign Up";
        document.getElementById('confirm-password-field')?.classList.add('hidden');
        document.getElementById('password-strength-container')?.classList.add('hidden');
        document.getElementById('remember-me-field')?.classList.remove('hidden');
        document.getElementById('two-fa-field')?.classList.remove('hidden');
    }
    resetAuthForm();
});

function resetAuthForm() {
    const authForm = document.getElementById('auth-form');
    authForm?.reset();
    const authMessage = document.getElementById('auth-message');
    if (authMessage) authMessage.textContent = '';
}

// ═══════════════════════════════════════════════════════════
// CART EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

cartIcon?.addEventListener('click', toggleCart);
cartClose?.addEventListener('click', closeCart);
cartOverlay?.addEventListener('click', closeCart);
cartCheckoutBtn?.addEventListener('click', initiateCheckout);

// ═══════════════════════════════════════════════════════════
// PAGE INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    
    // Scroll reveal
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { 
                e.target.classList.add('in'); 
                revealObserver.unobserve(e.target); 
            }
        });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Mobile nav
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    hamburger?.addEventListener('click', () => mobileMenu?.classList.toggle('open'));
    mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu?.classList.remove('open')));

    // Language toggle
    document.getElementById('lang-select')?.addEventListener('change', function () {
        document.getElementById('about-en').style.display = this.value === 'hi' ? 'none' : '';
        document.getElementById('about-hi').style.display = this.value === 'hi' ? '' : 'none';
    });

    // Modal helpers
    const openModal = id => document.getElementById(id)?.classList.remove('hidden');
    const closeModal = id => document.getElementById(id)?.classList.add('hidden');

    document.getElementById('close-modal-btn')?.addEventListener('click', () => closeModal('planner-modal'));
    document.getElementById('close-order-modal')?.addEventListener('click', () => closeModal('order-modal'));

    ['planner-modal', 'auth-modal', 'order-modal'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', e => { 
            if (e.target.id === id) closeModal(id); 
        });
    });

    document.getElementById('show-weekly-planner-btn')?.addEventListener('click', () => openModal('planner-modal'));
    document.getElementById('menu-signin')?.addEventListener('click', () => openModal('auth-modal'));

    // Pricing toggle
    window.togglePricing = (type) => {
        const weeklyPricing = document.getElementById('weekly-pricing');
        const monthlyPricing = document.getElementById('monthly-pricing');
        const buttons = document.querySelectorAll('.toggle-btn');

        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        if (type === 'weekly') {
            weeklyPricing.style.display = 'grid';
            monthlyPricing.style.display = 'none';
        } else {
            weeklyPricing.style.display = 'none';
            monthlyPricing.style.display = 'grid';
        }
    };
});

// Weekly Planner
const showPlannerBtn = document.getElementById('show-weekly-planner-btn');
showPlannerBtn?.addEventListener('click', async () => {
    const plannerModal = document.getElementById('planner-modal');
    const modalContent = document.getElementById('modal-content');
    const modalLoader = document.getElementById('modal-loader');
    
    plannerModal?.classList.remove('hidden');
    modalContent.innerHTML = '';
    modalLoader.style.display = 'flex';

    const dishNames = currentMenuItems.map(item => item.name).join(', ');
    if (!dishNames) {
        modalContent.innerHTML = `<p style="text-align: center; color: #638792;">The menu is currently empty. Please add some dishes first!</p>`;
        modalLoader.style.display = 'none';
        return;
    }

    const prompt = `Create a balanced weekly meal plan (Mon-Fri) using these dishes: ${dishNames}. Format as simple HTML with h4 for days and p for dishes.`;

    try {
        const apiKey = "AIzaSyAECHdP5_6EpsPPY1Jf4MWBAPgHmyaXfsI";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API call failed: ${response.status}`);
        
        const result = await response.json();
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            modalContent.innerHTML = result.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid API response.");
        }

    } catch (error) {
        console.error("Planner generation failed:", error);
        modalContent.innerHTML = `<p style="text-align: center; color: #dc2626;">Could not generate a meal plan. Please try again later.</p>`;
    } finally {
        modalLoader.style.display = 'none';
    }
});

// Description generator
const generateDescBtn = document.getElementById('generate-description-btn');
generateDescBtn?.addEventListener('click', async () => {
    const itemName = document.getElementById('itemName').value;
    if (!itemName) {
        showToast('Please enter an item name first', 'warning');
        return;
    }

    generateDescBtn.disabled = true;
    generateDescBtn.textContent = '...';
    
    const prompt = `Write a short, appealing description for a home-cooked Indian dish named "${itemName}". About 20-25 words.`;
    
    try {
        const apiKey = "AIzaSyAECHdP5_6EpsPPY1Jf4MWBAPgHmyaXfsI";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        const payload = { contents: [{ parts: [{ text: prompt }] }] };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates[0].content.parts[0].text) {
            document.getElementById('itemDescription').value = result.candidates[0].content.parts[0].text;
            showToast('Description generated successfully!', 'success');
        } else {
            throw new Error("Invalid response structure from API.");
        }

    } catch (error) {
        console.error("Description generation failed:", error);
        showToast('Could not generate description. Please try again.', 'error');
    } finally {
        generateDescBtn.disabled = false;
        generateDescBtn.innerHTML = '✨ Auto-generate';
    }
});

console.log('✓ Swaadse.in cart and payment system loaded successfully!');
