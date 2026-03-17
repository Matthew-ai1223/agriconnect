/**
 * AgriConnect PWA Main Logic
 */

// State
const state = {
    currentSection: 'home',
    products: [
        { id: 1, name: 'Premium Maize Seeds', price: '₦12,500', img: 'images/maize.png' },
        { id: 2, name: 'Organic Fertilizer', price: '₦5,000', img: 'images/fertilizer.png' },
        { id: 3, name: 'Sprayer Pump', price: '₦8,200', img: 'https://images.unsplash.com/photo-1595856403061-0b5c1f03d29a?auto=format&fit=crop&q=80&w=300' },
        { id: 4, name: 'Rhode Island Red Chicks', price: '₦800', img: 'https://images.unsplash.com/photo-1547568573-05b1c5740443?auto=format&fit=crop&q=80&w=300' }
    ],
    vets: [
        { id: 1, name: 'Dr. Amina Bello', specialization: 'Livestock Specialist', rating: 4.8, img: 'images/vet-1.png' },
        { id: 2, name: 'Dr. John Okafor', specialization: 'Crop Pathologist', rating: 4.9, img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300' },
        { id: 3, name: 'Vet. Sarah Musa', specialization: 'Poultry Expert', rating: 4.7, img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300' }
    ]
};

// DOM Elements
// No additional global DOM elements needed for iframes

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Navigate to Home initially
    showSection('home');

    // Simulate Loading and Populate Data
    setTimeout(() => {
        populateMarketplace();
        populateVets();
    }, 1500);

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

// Data Population
function populateMarketplace() {
    const containers = [document.getElementById('home-products'), document.getElementById('market-list')];
    containers.forEach(container => {
        if (!container) return;
        container.innerHTML = '';
        state.products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.img}" alt="${product.name}" class="product-img" loading="lazy">
                <div class="product-details">
                    <div class="product-price">${product.price}</div>
                    <div class="text-sm mb-1">${product.name}</div>
                    <button class="btn btn-primary text-xs" style="width: 100%; padding: 0.5rem;">Buy Now</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
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

window.handleSellSubmit = function (e) {
    e.preventDefault();
    const name = document.getElementById('sell-name').value;
    const price = document.getElementById('sell-price').value;

    if (!name || !price) return;

    // Add to state
    const newProduct = {
        id: Date.now(),
        name: name,
        price: '₦' + parseInt(price).toLocaleString(),
        img: 'images/maize.png' // New generated placeholder
    };

    state.products.unshift(newProduct);

    // Refresh UI
    populateMarketplace();

    // Reset Form
    document.getElementById('sell-form').reset();
    closeModal('sell-modal');

    // Show success feedback
    showToast('Product Posted Successfully!', 'success');
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

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    
    // Show the popup automatically after 2 seconds for every new visit
    if (!sessionStorage.getItem('installDismissed')) {
        setTimeout(() => {
            openModal('install-popup');
        }, 2000);
    }
});

// Handle Install Button Click
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            // Hide the application provided install prompt
            closeModal('install-popup');
            
            if (deferredPrompt) {
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // We've used the prompt, and can't use it again, throw it away
                deferredPrompt = null;
            }
        });
    }
});

// Handle Dismissal
window.dismissInstall = function() {
    closeModal('install-popup');
    // Save dismissal state for this session only so it shows on next visit
    sessionStorage.setItem('installDismissed', 'true');
};
