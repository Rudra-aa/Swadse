import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqm3WSzAPGOQgUAd73bHtKY2VY1dXGj24",
    authDomain: "swaadse-in-website.firebaseapp.com",
    projectId: "swaadse-in-website",
    storageBucket: "swaadse-in-website.appspot.com",
    messagingSenderId: "1013679995805",
    appId: "1:1013679995805:web:10d373362004bb4aec0d74",
    measurementId: "G-JGHV6JWKF7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize EmailJS
emailjs.init('YOUR_PUBLIC_KEY'); // Replace with your EmailJS public key

// --- GLOBAL VARIABLES ---
const menuContainer = document.getElementById('menu-container');
const adminForm = document.getElementById('add-menu-item-form');
const adminMessage = document.getElementById('admin-message');
let currentMenuItems = [];
let unsubscribeMenuListener = null;

// --- AUTHENTICATION LISTENER ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is authenticated with UID:", user.uid);
        setupMenuListener();
        setupAdminForm();
        document.getElementById('menu-signin-prompt').classList.add('hidden');
        document.getElementById('menu-container').classList.remove('hidden');
        document.getElementById('sign-in-btn').classList.add('hidden');
        document.getElementById('user-actions').classList.remove('hidden');
        
        // Show phone number when logged in
        document.getElementById('phone-display').classList.add('hidden');
        document.getElementById('phone-actual').classList.remove('hidden');
        document.getElementById('login-prompt').classList.add('hidden');
    } else {
        console.log("No user found");
        document.getElementById('menu-signin-prompt').classList.remove('hidden');
        document.getElementById('menu-container').classList.add('hidden');
        document.getElementById('user-actions').classList.add('hidden');
        document.getElementById('sign-in-btn').classList.remove('hidden');
        
        // Hide phone number when not logged in
        document.getElementById('phone-display').classList.remove('hidden');
        document.getElementById('phone-actual').classList.add('hidden');
        document.getElementById('login-prompt').classList.remove('hidden');
    }
});

// --- DYNAMIC MENU DISPLAY ---
function setupMenuListener() {
    const menuCollectionRef = collection(db, `artifacts/${appId}/public/data/menu`);
    if (unsubscribeMenuListener) {
        unsubscribeMenuListener();
    }
    unsubscribeMenuListener = onSnapshot(menuCollectionRef, (snapshot) => {
        currentMenuItems = [];
        menuContainer.innerHTML = ''; // Clear previous items

        if (snapshot.empty) {
            menuContainer.innerHTML = `<p class="col-span-full text-center text-[#638792]">The menu for today is being prepared. Please check back soon!</p>`;
            return;
        } 
        
        snapshot.forEach(doc => {
            const item = doc.data();
            // Skip 'samosa', 'shahee paneer', 'shahi paneer' (case-insensitive, trimmed)
            const forbidden = ["samosa", "shahee paneer", "shahi paneer"];
            if (item.name && forbidden.includes(item.name.trim().toLowerCase())) {
                return;
            }
            currentMenuItems.push(item);
            // Optionally, you can log or use the currentMenuItems array elsewhere as your menu list
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
                    <div class="text-2xl font-bold text-[#3c4548]">₹${item.price}</div>
                </div>
            `;
            menuContainer.appendChild(menuItemEl);
        });
        
    }, (error) => {
        console.error("Firestore Permission Error: ", error);
        menuContainer.innerHTML = `<p class="col-span-full text-center text-red-500">Could not load the menu due to an error.</p>`;
    });
}


// --- ADMIN PANEL LOGIC ---
function setupAdminForm() {
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
            adminMessage.textContent = 'Menu item added successfully!';
            adminMessage.classList.remove('text-red-600');
            adminMessage.classList.add('text-green-600');
        } catch (error) {
            console.error("Error adding document: ", error);
            adminMessage.textContent = 'Error adding item. Please check your Firebase rules.';
            adminMessage.classList.remove('text-green-600');
            adminMessage.classList.add('text-red-600');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Item to Menu';
            setTimeout(() => adminMessage.textContent = '', 3000);
        }
    });
}

// --- AUTH MODAL LOGIC ---
const signInBtn = document.getElementById('sign-in-btn');
signInBtn.addEventListener('click', () => {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-title').textContent = 'Sign In';
    document.getElementById('auth-submit').textContent = 'Sign In';
    document.getElementById('toggle-auth').textContent = "Don't have an account? Sign Up";
    document.getElementById('confirm-password-field').classList.add('hidden');
    document.getElementById('password-strength-container').classList.add('hidden');
    document.getElementById('remember-me-field').classList.remove('hidden');
    document.getElementById('two-fa-field').classList.remove('hidden');
});

const closeAuthModal = document.getElementById('close-auth-modal');
closeAuthModal.addEventListener('click', () => {
    document.getElementById('auth-modal').classList.add('hidden');
    resetAuthForm();
});

const menuSignin = document.getElementById('menu-signin');
if (menuSignin) {
    menuSignin.addEventListener('click', () => {
        document.getElementById('auth-modal').classList.remove('hidden');
    });
}

// Password visibility toggle
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    document.getElementById('password-eye').textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
});

// Email validation feedback
document.getElementById('email').addEventListener('input', (e) => {
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

// Password strength indicator
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
}

document.getElementById('password').addEventListener('input', (e) => {
    if (!isSignUp) return;
    const password = e.target.value;
    const feedback = document.getElementById('password-feedback');
    const strengthContainer = document.getElementById('password-strength-container');
    
    if (password === '') {
        feedback.textContent = '';
        strengthContainer.classList.add('hidden');
        return;
    }
    
    strengthContainer.classList.remove('hidden');
    const strength = checkPasswordStrength(password);
    const strengthText = document.getElementById('strength-text');
    const bars = ['strength-bar-1', 'strength-bar-2', 'strength-bar-3', 'strength-bar-4'];
    
    // Reset bars
    bars.forEach(bar => {
        document.getElementById(bar).style.backgroundColor = '#d1d5db';
    });
    
    // Set strength indicators
    const strengthLevels = ['Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#dc2626', '#ea580c', '#eab308', '#16a34a'];
    
    for (let i = 0; i < strength; i++) {
        document.getElementById(bars[i]).style.backgroundColor = strengthColors[i];
    }
    
    strengthText.textContent = strengthLevels[strength - 1] || 'Very Weak';
    strengthText.style.color = strengthColors[strength - 1] || '#dc2626';
    
    // Validation feedback
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
    
    // Check confirm password match
    const confirmPasswordField = document.getElementById('confirm-password');
    if (confirmPasswordField.value) {
        validateConfirmPassword();
    }
});

// Confirm password validation
function validateConfirmPassword() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const feedback = document.getElementById('confirm-feedback');
    
    if (confirmPassword === '') {
        feedback.textContent = '';
        return true;
    }
    
    if (password === confirmPassword) {
        feedback.textContent = '✓ Passwords match';
        feedback.style.color = '#16a34a';
        return true;
    } else {
        feedback.textContent = '✗ Passwords do not match';
        feedback.style.color = '#dc2626';
        return false;
    }
}

document.getElementById('confirm-password').addEventListener('input', validateConfirmPassword);

// Auth form toggle (Sign Up / Sign In)
let isSignUp = false;
const toggleAuth = document.getElementById('toggle-auth');
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    if (isSignUp) {
        document.getElementById('auth-title').textContent = 'Create Account';
        document.getElementById('auth-submit').textContent = 'Sign Up';
        toggleAuth.textContent = 'Already have an account? Sign In';
        document.getElementById('confirm-password-field').classList.remove('hidden');
        document.getElementById('password-strength-container').classList.remove('hidden');
        document.getElementById('remember-me-field').classList.add('hidden');
        document.getElementById('two-fa-field').classList.add('hidden');
    } else {
        document.getElementById('auth-title').textContent = 'Sign In';
        document.getElementById('auth-submit').textContent = 'Sign In';
        toggleAuth.textContent = "Don't have an account? Sign Up";
        document.getElementById('confirm-password-field').classList.add('hidden');
        document.getElementById('password-strength-container').classList.add('hidden');
        document.getElementById('remember-me-field').classList.remove('hidden');
        document.getElementById('two-fa-field').classList.remove('hidden');
    }
    resetAuthForm();
});

function resetAuthForm() {
    document.getElementById('auth-form').reset();
    document.getElementById('auth-message').textContent = '';
    document.getElementById('email-feedback').textContent = '';
    document.getElementById('password-feedback').textContent = '';
    document.getElementById('confirm-feedback').textContent = '';
    document.getElementById('password-strength-container').classList.add('hidden');
}

// Enhanced auth form submission
const authForm = document.getElementById('auth-form');
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMessage = document.getElementById('auth-message');
    const submitBtn = document.getElementById('auth-submit');
    
    // Validation
    if (!email || !password) {
        authMessage.textContent = 'Please fill in all required fields';
        authMessage.style.color = '#dc2626';
        return;
    }
    
    if (isSignUp) {
        const confirmPassword = document.getElementById('confirm-password').value;
        if (!confirmPassword) {
            authMessage.textContent = 'Please confirm your password';
            authMessage.style.color = '#dc2626';
            return;
        }
        if (password !== confirmPassword) {
            authMessage.textContent = 'Passwords do not match';
            authMessage.style.color = '#dc2626';
            return;
        }
        const strength = checkPasswordStrength(password);
        if (strength < 2) {
            authMessage.textContent = 'Password is too weak. Please use a stronger password';
            authMessage.style.color = '#dc2626';
            return;
        }
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';
    
    try {
        if (isSignUp) {
            await createUserWithEmailAndPassword(auth, email, password);
            authMessage.textContent = 'Account created successfully! 🎉';
            authMessage.style.color = '#16a34a';
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            authMessage.textContent = 'Signed in successfully! Welcome back 👋';
            authMessage.style.color = '#16a34a';
        }
        setTimeout(() => {
            document.getElementById('auth-modal').classList.add('hidden');
            resetAuthForm();
            isSignUp = false;
        }, 2000);
    } catch (error) {
        authMessage.textContent = error.message;
        authMessage.style.color = '#dc2626';
        console.error("Auth error:", error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    }
});

const signOutBtn = document.getElementById('sign-out-btn');
signOutBtn.addEventListener('click', async () => {
    await signOut(auth);
    document.getElementById('user-actions').classList.add('hidden');
    document.getElementById('sign-in-btn').classList.remove('hidden');
});

// Phone section login button
const loginPromptBtn = document.querySelector('#login-prompt button');
if (loginPromptBtn) {
    loginPromptBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('auth-title').textContent = 'Sign In';
        document.getElementById('auth-submit').textContent = 'Sign In';
        isSignUp = false;
    });
}

// --- GEMINI API: GENERATE DESCRIPTION ---
const generateDescBtn = document.getElementById('generate-description-btn');
const itemNameInput = document.getElementById('itemName');
const itemDescTextarea = document.getElementById('itemDescription');

generateDescBtn.addEventListener('click', async () => {
    const itemName = itemNameInput.value;
    if (!itemName) {
        alert("Please enter an item name first.");
        return;
    }

    generateDescBtn.disabled = true;
    generateDescBtn.textContent = '...';
    
    const prompt = `Write a short, appealing, and delicious-sounding description for a home-cooked Indian dish named "${itemName}". The description should be about 20-25 words long and suitable for a food website menu.`;
    
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
            itemDescTextarea.value = result.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid response structure from API.");
        }

    } catch (error) {
        console.error("Gemini description generation failed:", error);
        alert("Could not generate description. Please try again or write one manually.");
    } finally {
        generateDescBtn.disabled = false;
        generateDescBtn.innerHTML = '✨ Auto-generate';
    }
});

// --- GEMINI API: WEEKLY PLANNER ---
const plannerModal = document.getElementById('planner-modal');
const showPlannerBtn = document.getElementById('show-weekly-planner-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalContent = document.getElementById('modal-content');
const modalLoader = document.getElementById('modal-loader');

showPlannerBtn.addEventListener('click', async () => {
    plannerModal.classList.remove('hidden');
    modalContent.innerHTML = ''; 
    modalLoader.style.display = 'flex';

    const dishNames = currentMenuItems.map(item => item.name).join(', ');
    if (!dishNames) {
         modalContent.innerHTML = `<p class="text-center text-[#638792]">The menu is currently empty. Please add some dishes first to get a suggestion!</p>`;
         modalLoader.style.display = 'none';
         return;
    }

    const prompt = `You are a friendly meal planner for a home kitchen called "SwaadSe.in". Given the following available dishes: ${dishNames}. Create a balanced and interesting weekly meal plan suggestion (Monday to Friday) for a customer. Present it in a simple, clean HTML format using h4 for days and p for the dish. Do not include any other text, just the HTML.`;

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
        console.error("Gemini planner generation failed:", error);
        modalContent.innerHTML = `<p class="text-center text-red-600">Sorry, we couldn't generate a meal plan right now. Please try again later.</p>`;
    } finally {
        modalLoader.style.display = 'none';
    }
});

closeModalBtn.addEventListener('click', () => {
    plannerModal.classList.add('hidden');
});

// --- ORDER MODAL LOGIC ---
const orderBtn = document.getElementById('order-btn');
orderBtn.addEventListener('click', () => {
    if (!auth.currentUser) {
        alert('Please sign in to place an order.');
        return;
    }
    document.getElementById('order-modal').classList.remove('hidden');
    populateOrderItems();
});

function populateOrderItems() {
    const orderItems = document.getElementById('order-items');
    orderItems.innerHTML = '';
    currentMenuItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        div.innerHTML = `
            <input type="checkbox" id="item-${item.name.replace(/\s+/g, '-')}" value="${item.name}" class="mr-2">
            <label for="item-${item.name.replace(/\s+/g, '-')}" class="text-[#7a6c5d]">${item.name} - ₹${item.price}</label>
            <input type="number" min="1" value="1" class="ml-2 w-16 rounded border-[#f7b267]">
        `;
        orderItems.appendChild(div);
    });
}

const closeOrderModal = document.getElementById('close-order-modal');
closeOrderModal.addEventListener('click', () => {
    document.getElementById('order-modal').classList.add('hidden');
});

const orderForm = document.getElementById('order-form');
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const email = document.getElementById('order-email').value;
    const message = document.getElementById('order-message').value;
    const selectedItems = [];
    currentMenuItems.forEach(item => {
        const checkbox = document.getElementById(`item-${item.name.replace(/\s+/g, '-')}`);
        if (checkbox.checked) {
            const qtyInput = checkbox.nextElementSibling.nextElementSibling;
            const qty = qtyInput.value;
            selectedItems.push(`${item.name} x${qty} - ₹${item.price * qty}`);
        }
    });
    if (selectedItems.length === 0) {
        alert('Please select at least one item.');
        return;
    }
    const orderDetails = {
        name,
        phone,
        email,
        items: selectedItems.join(', '),
        message
    };
    // Send email using EmailJS
    try {
        await emailjs.send(
            'YOUR_SERVICE_ID', // replace with your service ID
            'YOUR_TEMPLATE_ID', // replace with your template ID
            {
                to_email: 'your-email@example.com', // owner's email
                from_name: name,
                from_email: email,
                subject: 'New Order from SwaadSe.in',
                message: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nItems: ${selectedItems.join(', ')}\nInstructions: ${message}`
            },
            'YOUR_PUBLIC_KEY' // replace with your public key
        );
        document.getElementById('order-message').textContent = 'Order placed successfully! We will contact you soon.';
        document.getElementById('order-message').classList.remove('text-red-600');
        document.getElementById('order-message').classList.add('text-green-600');
        orderForm.reset();
        setTimeout(() => {
            document.getElementById('order-modal').classList.add('hidden');
        }, 3000);
    } catch (error) {
        console.error('Email send failed:', error);
        document.getElementById('order-message').textContent = 'Failed to place order. Please try again.';
        document.getElementById('order-message').classList.remove('text-green-600');
        document.getElementById('order-message').classList.add('text-red-600');
    }
});