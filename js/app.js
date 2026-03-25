const state = {
    currentSection: 'home',
    currentUser: JSON.parse(localStorage.getItem('myfarmai_user')) || null,
    authMode: 'login', // 'login' or 'signup'
    products: [],
    vets: [],
    cart: []
};

// API Configuration
// const API_BASE = window.location.origin.includes('localhost') 
//     ? 'http://localhost:3000/api' 
//     : 'https://farm-ai-iota.vercel.app/api'; 

const API_BASE = 'https://farm-ai-iota.vercel.app/api';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Navigate to Home initially
    showSection('home');
    updateAuthUI();

    // Population from Backend
    fetchProducts();
    fetchVets();
    if (state.currentUser) {
        syncCart();
    }

    updateSignupLegalVisibility();

    scheduleInstallPopup();
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            closeModal('install-popup');
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
            } else {
                showToast('Add this site to your home screen from the browser menu, or install may not be available here.', 'info');
            }
        });
    }

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker Registered'))
                .catch(err => console.log('Service Worker Failed', err));
        });
    }
});

// Navigation Logic
window.showSection = function (sectionId) {
    state.currentSection = sectionId;

    document.querySelectorAll('main > section').forEach(sec => {
        sec.classList.add('d-none');
        sec.classList.remove('active-section');
    });

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove('d-none');
        target.classList.add('active-section');
    }

    const navMapping = {
        'home': 'Home',
        'ai-chat': 'Ask AI',
        'market': 'Shop',
        'consult': 'Consult Vets'
    };

    // Bottom Nav
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        nav.style.color = 'var(--text-secondary)';
    });

    let navId = 'nav-home';
    if (sectionId === 'ai-chat') navId = 'nav-chat';
    else if (sectionId === 'market') navId = 'nav-market';
    else if (sectionId === 'consult') navId = 'nav-consult';

    const activeNav = document.getElementById(navId);
    if (activeNav) {
        activeNav.classList.add('active');
        activeNav.style.color = 'var(--primary)';
    }

    // Desktop Nav
    document.querySelectorAll('.desktop-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.textContent === navMapping[sectionId]) {
            link.classList.add('active');
        }
    });

    window.scrollTo(0, 0);
};

// Data Population (API Driven)
async function fetchProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();
        if (data.status === 'success') {
            state.products = data.data;
            populateMarketplace();
        }
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

async function fetchVets() {
    try {
        const res = await fetch(`${API_BASE}/consultants`);
        const data = await res.json();
        if (data.status === 'success') {
            state.vets = data.data;
            populateVets();
        }
    } catch (err) {
        console.error('Failed to fetch vets:', err);
    }
}

function populateMarketplace() {
    const containers = [document.getElementById('market-list')];
    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';
        if (state.products.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No products found. Be the first to sell!</p>';
            return;
        }
        state.products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Get high-quality placeholder if image is missing
            const finalImage = product.image || getCategoryPlaceholder(product.category);

            card.innerHTML = `
                <img src="${finalImage}" alt="${product.title}" class="product-img" loading="lazy">
                <div class="product-details">
                    <div class="product-price">₦${product.price.toLocaleString()}</div>
                    <div class="text-sm mb-1" style="font-weight:600;">${product.title}</div>
                    <div class="text-xs text-muted mb-2">${product.category}</div>
                    <button class="btn btn-primary text-xs mb-2" style="width: 100%; padding: 0.5rem;" onclick="addToCart('${product.id}')">Add to Cart</button>
                    ${product.sellerPhone ? `
                        <a href="https://wa.me/${product.sellerPhone.replace(/\D/g, '')}?text=Hello, I am interested in your ${product.title} on MyFarmAI" 
                           target="_blank" class="btn btn-outline text-xs" style="width: 100%; padding: 0.5rem; text-decoration: none; display: flex; align-items: center; justify-content: center; border-color: #25D366; color: #25D366;">
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                             <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                           </svg>
                           Contact Seller
                        </a>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function getCategoryPlaceholder(category) {
    const placeholders = {
        'Seeds': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400',
        'Tools': 'https://images.unsplash.com/photo-1595856403061-0b5c1f03d29a?auto=format&fit=crop&q=80&w=400',
        'Produce': 'https://images.unsplash.com/photo-1597362871122-2045d23919d1?auto=format&fit=crop&q=80&w=400',
        'Livestock': 'https://images.unsplash.com/photo-1547568573-05b1c5740443?auto=format&fit=crop&q=80&w=400',
        'Fertilizer': 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&q=80&w=400'
    };
    return placeholders[category] || 'https://images.unsplash.com/photo-1595856403061-0b5c1f03d29a?auto=format&fit=crop&q=80&w=400';
}

function populateVets() {
    const container = document.getElementById('home-vets');
    if (!container) return;
    container.innerHTML = '';

    state.vets.forEach(vet => {
        const card = document.createElement('div');
        card.className = 'card vet-card';
        card.style.marginBottom = '0.75rem';
        card.innerHTML = `
            <div class="vet-avatar flex-center" style="overflow: hidden;">
                <img src="${vet.img || 'https://via.placeholder.com/60'}" alt="${vet.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0; font-size: 1rem;">${vet.name}</h4>
                <p class="text-xs text-muted" style="margin: 0;">${vet.specialization}</p>
                <div class="text-xs text-primary">★ ${vet.rating} / 5.0</div>
            </div>
            <button class="btn btn-outline text-xs" onclick="showSection('consult')">Consult</button>
        `;
        container.appendChild(card);
    });
}

// Modal Functions
window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
};

window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
};

window.handleSellSubmit = async function (e) {
    e.preventDefault();
    if (!state.currentUser) {
        showToast('Please log in to sell items.', 'error');
        showSection('auth');
        return;
    }

    const title = document.getElementById('sell-name').value;
    const price = document.getElementById('sell-price').value;
    const category = document.getElementById('sell-category').value;
    const image = document.getElementById('sell-image').value;
    const phone = document.getElementById('sell-phone').value;

    if (!title || !price) return;

    try {
        const res = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                price,
                category,
                image,
                phone,
                email: state.currentUser.email
            })
        });
        const data = await res.json();

        if (data.status === 'success') {
            state.products.unshift(data.data);
            populateMarketplace();
            document.getElementById('sell-form').reset();
            closeModal('sell-modal');
            showToast('Product Posted Successfully!', 'success');
        }
    } catch (err) {
        showToast('Failed to post product.', 'error');
    }
};

// Auth Functions
function updateSignupLegalVisibility() {
    const signupLegal = document.getElementById('signup-legal');
    const termsAccept = document.getElementById('terms-accept');
    const consentYes = document.getElementById('ai-consent-yes');
    const consentNo = document.getElementById('ai-consent-no');
    if (!signupLegal) return;

    if (state.authMode === 'signup') {
        signupLegal.classList.remove('d-none');
        if (termsAccept) termsAccept.required = true;
        if (consentYes) consentYes.required = true;
        if (consentNo) consentNo.required = false;
    } else {
        signupLegal.classList.add('d-none');
        if (termsAccept) {
            termsAccept.required = false;
            termsAccept.checked = false;
        }
        if (consentYes) {
            consentYes.required = false;
            consentYes.checked = false;
        }
        if (consentNo) {
            consentNo.required = false;
            consentNo.checked = false;
        }
    }
}

window.toggleAuthMode = function () {
    state.authMode = state.authMode === 'login' ? 'signup' : 'login';
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');

    if (state.authMode === 'signup') {
        title.textContent = 'Create Account';
        submitBtn.textContent = 'Start My Journey';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign In';
    } else {
        title.textContent = 'Welcome Back';
        submitBtn.textContent = 'Secure Login';
        toggleText.textContent = 'New to MyFarmAI?';
        toggleLink.textContent = 'Create Account';
    }
    updateSignupLegalVisibility();
};

window.handleAuthSubmit = async function (e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value; // We don't hash yet for simplicity

    const payload = { email };

    if (state.authMode === 'signup') {
        const termsAccept = document.getElementById('terms-accept');
        const consent = document.querySelector('input[name="ai-data-consent"]:checked');
        if (!termsAccept || !termsAccept.checked) {
            showToast('Please read and accept the Terms & Conditions.', 'error');
            return;
        }
        if (!consent) {
            showToast('Please choose Yes or No for using your data to improve our AI.', 'error');
            return;
        }
        payload.termsAccepted = true;
        payload.aiDataConsent = consent.value;
    }

    try {
        const res = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            state.currentUser = { email: data.email };
            if (data.aiDataConsent === 'yes' || data.aiDataConsent === 'no') {
                state.currentUser.aiDataConsent = data.aiDataConsent;
            }
            localStorage.setItem('myfarmai_user', JSON.stringify(state.currentUser));
            updateAuthUI();
            syncUserToAI(); // [NEW] Sync after login
            syncCart();
            showSection('home');
            showToast('Welcome to MyFarmAI!', 'success');
        }
    } catch (err) {
        showToast('Connection failed. Please check your internet.', 'error');
    }
};

window.handleLogout = function () {
    state.currentUser = null;
    localStorage.removeItem('myfarmai_user');
    state.cart = [];
    updateAuthUI();
    syncUserToAI(true); // [NEW] Clear AI session
    renderCart();
    showSection('home');
    showToast('Logged out successfully.');
};

function syncUserToAI(clear = false) {
    const iframe = document.getElementById('ai-iframe');
    if (!iframe) return;

    const data = clear ? { type: 'LOGOUT' } : {
        type: 'LOGIN_SYNC',
        email: state.currentUser ? state.currentUser.email : null
    };

    // Send the user state to the AI iframe
    iframe.contentWindow.postMessage(data, '*');
}

function updateAuthUI() {
    const profileBtn = document.getElementById('profile-btn');
    const userDisplay = document.getElementById('user-display');
    const userEmailHeader = document.getElementById('user-email-header');

    if (state.currentUser) {
        profileBtn.classList.add('d-none');
        userDisplay.classList.remove('d-none');
        userDisplay.style.display = 'flex';
        userEmailHeader.textContent = state.currentUser.email.split('@')[0];
    } else {
        profileBtn.classList.remove('d-none');
        userDisplay.classList.add('d-none');
        userDisplay.style.display = 'none';
    }
}

// Cart Logic
window.toggleCart = function () {
    const panel = document.getElementById('cart-panel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        syncCart();
    }
};

window.addToCart = async function (productId) {
    if (!state.currentUser) {
        showToast('Please log in to add items to cart.', 'error');
        showSection('auth');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: state.currentUser.email,
                productId: productId
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast('Added to cart!');
            syncCart();
        }
    } catch (err) {
        showToast('Could not reach server.', 'error');
    }
};

async function syncCart() {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/cart?email=${state.currentUser.email}`);
        const data = await res.json();
        if (data.status === 'success') {
            state.cart = data.data;
            renderCart();
        }
    } catch (err) {
        console.error('Cart sync failed:', err);
    }
}

function renderCart() {
    const list = document.getElementById('cart-items');
    const count = document.getElementById('cart-count');
    const totalEl = document.getElementById('cart-total');

    if (!list) return;

    list.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    if (state.cart.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding-top: 3rem;">Your cart is empty.</p>';
    } else {
        state.cart.forEach(item => {
            const product = item.product;
            total += (product.price * item.quantity);
            itemCount += item.quantity;

            const div = document.createElement('div');
            div.style.cssText = 'display: flex; gap: 1rem; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border-soft);';
            div.innerHTML = `
                <img src="${product.image || 'images/maize.png'}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${product.title}</div>
                    <div style="color: var(--primary); font-size: 0.9rem;">₦${product.price.toLocaleString()} x ${item.quantity}</div>
                </div>
            `;
            list.appendChild(div);
        });
    }

    count.textContent = itemCount;
    totalEl.textContent = `₦${total.toLocaleString()}`;
}

window.handleCheckout = function () {
    showToast('Checkout feature coming soon!', 'info');
    toggleCart();
};

// Toast Notification System
function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Export for use in other parts
window.showToast = showToast;

// Role Selection for Auth
window.selectRole = function (button) {
    // Remove active class from all role buttons
    const roleButtons = document.querySelectorAll('#role-selector .btn');
    roleButtons.forEach(btn => btn.classList.remove('active'));

    // Add active to selected button
    button.classList.add('active');

    const role = button.getAttribute('data-role');
    console.log('Selected role:', role);
    // You can store this for backend submission
};

// PWA Install Prompt Logic
let deferredPrompt;
let installPopupTimer;

function isRunningAsInstalledPwa() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function scheduleInstallPopup() {
    if (isRunningAsInstalledPwa()) return;
    if (installPopupTimer) clearTimeout(installPopupTimer);
    installPopupTimer = setTimeout(() => {
        installPopupTimer = null;
        openModal('install-popup');
    }, 2000);
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.addEventListener('pageshow', (event) => {
    if (event.persisted) scheduleInstallPopup();
});

// Handle Dismissal (no local/session storage — popup shows again on next open or refresh)
window.dismissInstall = function () {
    closeModal('install-popup');
};
