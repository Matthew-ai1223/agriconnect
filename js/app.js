const state = {
    currentSection: 'home',
    currentUser: JSON.parse(localStorage.getItem('myfarmai_user')) || null,
    authMode: 'login', // 'login' or 'signup'
    products: [],
    vets: [],
    cart: []
};

// API: use local backend on localhost (for Cloudinary upload + API during dev)
const API_BASE =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : 'https://farm-ai-iota.vercel.app/api';

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
    } else {
        renderCart();
    }

    updateSignupLegalVisibility();

    const marketSearch = document.getElementById('market-search');
    const marketCategory = document.getElementById('market-category');
    if (marketSearch) marketSearch.addEventListener('input', applyMarketFilter);
    if (marketCategory) marketCategory.addEventListener('change', applyMarketFilter);

    const sellImageFile = document.getElementById('sell-image-file');
    if (sellImageFile) {
        sellImageFile.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            await uploadSellImageToCloudinary(file);
        });
    }
    const sellImageRemove = document.getElementById('sell-image-remove');
    if (sellImageRemove) {
        sellImageRemove.addEventListener('click', () => resetSellImageUI());
    }

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
        'consult': 'Vet Connect'
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
function escapeHtml(text) {
    if (text == null) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

async function fetchProducts() {
    try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();
        if (data.status === 'success') {
            state.products = data.data || [];
            rebuildMarketCategoryOptions();
            populateHomeTopProducts();
            applyMarketFilter();
        }
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

function populateHomeTopProducts() {
    const container = document.getElementById('home-top-products');
    if (!container) return;
    container.innerHTML = '';

    const list = (state.products || []).slice(0, 4);
    if (!list.length) {
        container.innerHTML =
            '<p style="text-align:center; color: var(--text-muted); grid-column: 1/-1;">No products yet.</p>';
        return;
    }

    const userEmail = state.currentUser?.email?.toLowerCase() || '';

    list.forEach((product) => {
        const rawImg = product.image;
        const imgUrl =
            rawImg != null && String(rawImg).trim() !== '' ? String(rawImg).trim() : '';
        const finalImage = imgUrl || getCategoryPlaceholder(product.category);

        const sellerEmail = (product.sellerEmail || '').toLowerCase();
        const isOwner = Boolean(userEmail && sellerEmail && userEmail === sellerEmail);

        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('role', 'listitem');

        const img = document.createElement('img');
        img.src = finalImage;
        img.alt = product.title || '';
        img.className = 'product-img';
        img.loading = 'lazy';
        img.style.height = '140px';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.onerror = function () {
            img.onerror = null;
            img.src = getCategoryPlaceholder(product.category);
        };

        const details = document.createElement('div');
        details.className = 'product-details';
        details.style.padding = '1rem';

        const titleSafe = escapeHtml(product.title);
        const catSafe = escapeHtml(product.category || '');
        details.innerHTML = `
            <div class="product-price">₦${Number(product.price).toLocaleString()}</div>
            <div class="text-sm mb-1" style="font-weight:600; font-size:0.95rem;">${titleSafe}</div>
            <div class="text-xs text-muted mb-2">${catSafe}</div>
        `;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isOwner ? 'btn btn-outline text-xs' : 'btn btn-primary text-xs';
        btn.style.cssText = 'width: 100%; padding: 0.6rem; margin-top: 0.25rem;';
        btn.textContent = isOwner ? 'Manage listing' : 'Add to cart';
        btn.addEventListener('click', () => {
            if (isOwner) showSection('market');
            else addToCart(product.id);
        });

        details.appendChild(btn);

        card.appendChild(img);
        card.appendChild(details);
        container.appendChild(card);
    });
}

function rebuildMarketCategoryOptions() {
    const sel = document.getElementById('market-category');
    if (!sel) return;
    const preserved = sel.value;
    const cats = [...new Set(state.products.map((p) => p.category).filter(Boolean))].sort();
    sel.innerHTML = '<option value="all">All categories</option>';
    cats.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
    });
    if ([...sel.options].some((o) => o.value === preserved)) sel.value = preserved;
}

function applyMarketFilter() {
    const q = (document.getElementById('market-search')?.value || '').trim().toLowerCase();
    const cat = document.getElementById('market-category')?.value || 'all';
    let list = state.products.slice();
    if (cat !== 'all') list = list.filter((p) => p.category === cat);
    if (q) {
        list = list.filter(
            (p) =>
                (p.title && String(p.title).toLowerCase().includes(q)) ||
                (p.category && String(p.category).toLowerCase().includes(q)) ||
                (p.description && String(p.description).toLowerCase().includes(q))
        );
    }
    populateMarketplace(list);
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

function populateMarketplace(products) {
    const list = products !== undefined ? products : state.products;
    const container = document.getElementById('market-list');
    if (!container) return;
    container.innerHTML = '';

    if (!list.length) {
        const noProducts = state.products.length === 0;
        container.innerHTML = noProducts
            ? '<p class="market-empty" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No listings yet. Tap <strong>Sell item</strong> to post seeds, tools, or produce.</p>'
            : '<p class="market-empty" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No products match your search or filters. Try different keywords or choose &ldquo;All categories&rdquo;.</p>';
        return;
    }

    const userEmail = state.currentUser?.email?.toLowerCase() || '';

    list.forEach((product) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('role', 'listitem');

        const sellerEmail = (product.sellerEmail || '').toLowerCase();
        const isOwner = Boolean(userEmail && sellerEmail && userEmail === sellerEmail);

        if (isOwner) card.classList.add('product-card--own');

        const rawImg = product.image;
        const imgUrl =
            rawImg != null && String(rawImg).trim() !== '' ? String(rawImg).trim() : '';
        const finalImage = imgUrl || getCategoryPlaceholder(product.category);
        const titleSafe = escapeHtml(product.title);
        const catSafe = escapeHtml(product.category || '');
        const rawDesc = String(product.description || '');
        const descSnippet = rawDesc
            ? `${escapeHtml(rawDesc.slice(0, 90))}${rawDesc.length > 90 ? '…' : ''}`
            : '';
        const wa = product.sellerPhone ? product.sellerPhone.replace(/\D/g, '') : '';
        const msg = encodeURIComponent(`Hello, I am interested in your ${product.title} on MyFarmAI`);

        const img = document.createElement('img');
        img.src = finalImage;
        img.alt = product.title || '';
        img.className = 'product-img';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.onerror = function () {
            img.onerror = null;
            img.src = getCategoryPlaceholder(product.category);
        };

        const details = document.createElement('div');
        details.className = 'product-details';

        let headerHtml = '';
        if (isOwner) {
            headerHtml = '<div class="product-card__badge">Your listing</div>';
        }

        details.innerHTML = `
            ${headerHtml}
            <div class="product-price">₦${Number(product.price).toLocaleString()}</div>
            <div class="text-sm mb-1" style="font-weight:600;">${titleSafe}</div>
            <div class="text-xs text-muted mb-2">${catSafe}</div>
            ${descSnippet ? `<div class="text-xs text-muted mb-2" style="line-height:1.4;">${descSnippet}</div>` : ''}
        `;

        const actions = document.createElement('div');
        actions.className = 'product-card__actions';

        if (isOwner) {
            const row = document.createElement('div');
            row.className = 'product-card__row';
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'btn btn-outline text-xs';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => startEditProduct(product));
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn btn-outline text-xs';
            delBtn.style.color = '#ef4444';
            delBtn.style.borderColor = 'rgba(239,68,68,0.35)';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => deleteProduct(product.id));
            row.appendChild(editBtn);
            row.appendChild(delBtn);
            actions.appendChild(row);
        } else {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn-primary text-xs';
            addBtn.style.cssText = 'width: 100%; padding: 0.5rem;';
            addBtn.textContent = 'Add to cart';
            addBtn.addEventListener('click', () => addToCart(product.id));
            actions.appendChild(addBtn);
        }

        if (product.sellerPhone && wa && !isOwner) {
            const a = document.createElement('a');
            a.href = `https://wa.me/${wa}?text=${msg}`;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'btn btn-outline text-xs';
            a.style.cssText =
                'width: 100%; padding: 0.5rem; text-decoration: none; display: flex; align-items: center; justify-content: center; border-color: #25D366; color: #25D366;';
            a.innerHTML =
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> Contact seller';
            actions.appendChild(a);
        }

        details.appendChild(actions);

        card.appendChild(img);
        card.appendChild(details);
        container.appendChild(card);
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

function resetSellImageUI() {
    const hidden = document.getElementById('sell-image');
    const file = document.getElementById('sell-image-file');
    const fallback = document.getElementById('sell-image-url-fallback');
    const wrap = document.getElementById('sell-image-preview-wrap');
    const prev = document.getElementById('sell-image-preview');
    const status = document.getElementById('sell-upload-status');
    if (hidden) hidden.value = '';
    if (file) file.value = '';
    if (fallback) fallback.value = '';
    if (status) status.textContent = '';
    if (wrap) wrap.style.display = 'none';
    if (prev) {
        prev.removeAttribute('src');
        prev.alt = '';
    }
}

function showSellImagePreview(url) {
    if (!url) return;
    const hidden = document.getElementById('sell-image');
    const wrap = document.getElementById('sell-image-preview-wrap');
    const prev = document.getElementById('sell-image-preview');
    if (hidden) hidden.value = url;
    if (prev) {
        prev.src = url;
        prev.alt = 'Product preview';
    }
    if (wrap) wrap.style.display = 'block';
}

/** Resolves product image URL from hidden field, paste field, or preview img (covers sync issues after upload). */
function resolveProductImageUrl() {
    const hidden = document.getElementById('sell-image')?.value?.trim() || '';
    const fallback = document.getElementById('sell-image-url-fallback')?.value?.trim() || '';
    const preview = document.getElementById('sell-image-preview');
    let previewUrl = '';
    if (preview && preview.src && /^https?:\/\//i.test(preview.src)) {
        previewUrl = preview.src.trim();
    }
    return hidden || fallback || previewUrl || '';
}

async function uploadSellImageToCloudinary(file) {
    const status = document.getElementById('sell-upload-status');
    if (status) status.textContent = 'Uploading…';
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/upload/cloudinary`, { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status !== 'success' || !data.url) {
        const err = data.error || data.message || `Upload failed (${res.status})`;
        if (status) status.textContent = err;
        showToast(err, 'error');
        return null;
    }
    const fallback = document.getElementById('sell-image-url-fallback');
    if (fallback) fallback.value = '';
    showSellImagePreview(data.url);
    if (status) status.textContent = 'Photo uploaded.';
    showToast('Image uploaded', 'success');
    return data.url;
}

window.openSellModal = function () {
    const idEl = document.getElementById('sell-product-id');
    const titleEl = document.getElementById('sell-modal-title');
    const btnEl = document.getElementById('sell-submit-btn');
    const form = document.getElementById('sell-form');
    if (form) form.reset();
    resetSellImageUI();
    if (idEl) idEl.value = '';
    if (titleEl) titleEl.textContent = 'List a product';
    if (btnEl) btnEl.textContent = 'Post listing';
    openModal('sell-modal');
};

window.startEditProduct = function (product) {
    if (!state.currentUser) {
        showToast('Sign in to edit your listings.', 'error');
        showSection('auth');
        return;
    }
    const idEl = document.getElementById('sell-product-id');
    const titleEl = document.getElementById('sell-modal-title');
    const btnEl = document.getElementById('sell-submit-btn');
    if (idEl) idEl.value = product.id;
    if (titleEl) titleEl.textContent = 'Edit listing';
    if (btnEl) btnEl.textContent = 'Save changes';
    document.getElementById('sell-name').value = product.title || '';
    document.getElementById('sell-price').value = product.price != null ? String(product.price) : '';
    document.getElementById('sell-category').value = product.category || 'Produce';
    document.getElementById('sell-phone').value = product.sellerPhone || '';
    const desc = document.getElementById('sell-description');
    if (desc) desc.value = product.description || '';
    const file = document.getElementById('sell-image-file');
    const fallback = document.getElementById('sell-image-url-fallback');
    const status = document.getElementById('sell-upload-status');
    if (file) file.value = '';
    if (fallback) fallback.value = '';
    if (status) status.textContent = '';
    const imgUrl = product.image || '';
    if (imgUrl) {
        showSellImagePreview(imgUrl);
    } else {
        resetSellImageUI();
    }
    openModal('sell-modal');
};

window.deleteProduct = async function (productId) {
    if (!state.currentUser) {
        showToast('Sign in to manage listings.', 'error');
        return;
    }
    if (!confirm('Remove this listing from the marketplace? This cannot be undone.')) return;

    try {
        const res = await fetch(
            `${API_BASE}/products/${encodeURIComponent(productId)}?email=${encodeURIComponent(state.currentUser.email)}`,
            { method: 'DELETE' }
        );
        const data = await res.json().catch(() => ({}));
        if (data.status === 'success') {
            state.products = state.products.filter((p) => p.id !== productId);
            rebuildMarketCategoryOptions();
            applyMarketFilter();
            if (typeof syncCart === 'function') await syncCart();
            showToast('Listing removed.', 'success');
        } else {
            showToast(data.error || data.message || 'Could not delete listing.', 'error');
        }
    } catch (err) {
        showToast('Could not reach server.', 'error');
    }
};

window.handleSellSubmit = async function (e) {
    e.preventDefault();
    if (!state.currentUser) {
        showToast('Please log in to sell items.', 'error');
        showSection('auth');
        return;
    }

    const editId = (document.getElementById('sell-product-id')?.value || '').trim();
    const title = document.getElementById('sell-name').value;
    const price = document.getElementById('sell-price').value;
    const category = document.getElementById('sell-category').value;
    const image = resolveProductImageUrl();
    const phone = document.getElementById('sell-phone').value;
    const description = document.getElementById('sell-description')?.value?.trim() || '';

    if (!title || !price) return;

    const payload = {
        title,
        price,
        category,
        phone,
        description,
        email: state.currentUser.email
    };
    if (image) {
        payload.image = image;
    }

    try {
        if (editId) {
            const res = await fetch(`${API_BASE}/products/${encodeURIComponent(editId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            if (data.status === 'success' && data.data) {
                const idx = state.products.findIndex((p) => p.id === editId);
                if (idx !== -1) state.products[idx] = data.data;
                rebuildMarketCategoryOptions();
                applyMarketFilter();
                document.getElementById('sell-form').reset();
                const hid = document.getElementById('sell-product-id');
                if (hid) hid.value = '';
                closeModal('sell-modal');
                showToast('Listing updated.', 'success');
            } else {
                showToast(data.error || data.message || 'Could not update listing.', 'error');
            }
            return;
        }

        const res = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.status === 'success') {
            state.products.unshift(data.data);
            rebuildMarketCategoryOptions();
            applyMarketFilter();
            document.getElementById('sell-form').reset();
            closeModal('sell-modal');
            showToast('Product posted successfully!', 'success');
        } else {
            showToast(data.message || 'Could not post product.', 'error');
        }
    } catch (err) {
        showToast('Failed to save listing.', 'error');
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
    const avatarEl = document.getElementById('user-avatar-initial');

    if (state.currentUser) {
        profileBtn.classList.add('d-none');
        userDisplay.classList.remove('d-none');
        userDisplay.style.display = '';
        const local = state.currentUser.email.split('@')[0];
        userEmailHeader.textContent = local;
        if (avatarEl) avatarEl.textContent = (local.charAt(0) || 'U').toUpperCase();
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
    if (!state.currentUser) {
        state.cart = [];
        renderCart();
        return;
    }
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
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!list) return;

    list.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    if (state.cart.length === 0) {
        list.innerHTML = '<p class="cart-drawer-placeholder">Your cart is empty. Browse the marketplace and add items.</p>';
    } else {
        state.cart.forEach((item) => {
            const product = item.product;
            const pid = item.productId;
            total += product.price * item.quantity;
            itemCount += item.quantity;

            const div = document.createElement('div');
            div.className = 'cart-line';
            div.innerHTML = `
                <img class="cart-line__img" src="${product.image || 'images/maize.png'}" alt="">
                <div class="cart-line__meta">
                    <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(product.title)}</div>
                    <div style="color: var(--primary); font-size: 0.85rem; margin-top: 0.25rem;">₦${Number(product.price).toLocaleString()} × ${item.quantity}</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-outline cart-qty-btn" data-act="dec" data-pid="${pid}" style="padding: 0.25rem 0.55rem; min-width: 2rem; font-size: 1rem; line-height: 1;" aria-label="Decrease quantity">−</button>
                        <span style="font-weight: 700; min-width: 1.5rem; text-align: center;">${item.quantity}</span>
                        <button type="button" class="btn btn-outline cart-qty-btn" data-act="inc" data-pid="${pid}" style="padding: 0.25rem 0.55rem; min-width: 2rem; font-size: 1rem; line-height: 1;" aria-label="Increase quantity">+</button>
                        <button type="button" class="btn btn-outline cart-remove-btn" data-pid="${pid}" style="margin-left: auto; padding: 0.35rem 0.65rem; font-size: 0.75rem; color: #ef4444; border-color: rgba(239,68,68,0.4);">Remove</button>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.cart-qty-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const pid = btn.getAttribute('data-pid');
                const act = btn.getAttribute('data-act');
                const item = state.cart.find((i) => i.productId === pid);
                if (!item) return;
                let q = item.quantity;
                if (act === 'inc') q += 1;
                else q -= 1;
                updateCartQuantity(pid, q);
            });
        });
        list.querySelectorAll('.cart-remove-btn').forEach((btn) => {
            btn.addEventListener('click', () => removeCartItem(btn.getAttribute('data-pid')));
        });
    }

    if (count) {
        count.textContent = itemCount;
        count.classList.toggle('cart-count-pill--empty', itemCount === 0);
    }
    if (totalEl) totalEl.textContent = `₦${total.toLocaleString()}`;
    if (checkoutBtn) {
        checkoutBtn.disabled = itemCount === 0;
        checkoutBtn.setAttribute('aria-disabled', itemCount === 0 ? 'true' : 'false');
    }
}

async function updateCartQuantity(productId, quantity) {
    if (!state.currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/cart/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: state.currentUser.email,
                productId,
                quantity
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            state.cart = data.data;
            renderCart();
        } else {
            showToast(data.error || 'Could not update cart.', 'error');
        }
    } catch (err) {
        showToast('Could not reach server.', 'error');
    }
}

async function removeCartItem(productId) {
    await updateCartQuantity(productId, 0);
}

window.handleCheckout = function () {
    if (!state.currentUser) {
        showToast('Please sign in to checkout.', 'error');
        showSection('auth');
        return;
    }
    if (!state.cart || state.cart.length === 0) {
        showToast('Your cart is empty.', 'info');
        return;
    }
    const phoneEl = document.getElementById('checkout-phone');
    const notesEl = document.getElementById('checkout-notes');
    if (phoneEl) phoneEl.value = '';
    if (notesEl) notesEl.value = '';

    const summaryEl = document.getElementById('checkout-summary');
    if (summaryEl) {
        let sub = 0;
        const lines = state.cart.map((item) => {
            const p = item.product;
            const line = Number(p.price) * item.quantity;
            sub += line;
            return `<div class="checkout-summary__line"><span>${escapeHtml(p.title)} × ${item.quantity}</span><span>₦${line.toLocaleString()}</span></div>`;
        });
        summaryEl.innerHTML =
            lines.join('') +
            `<div class="checkout-summary__line"><span>Total</span><span>₦${sub.toLocaleString()}</span></div>`;
    }

    const panel = document.getElementById('cart-panel');
    if (panel && panel.classList.contains('open')) {
        panel.classList.remove('open');
    }
    openModal('checkout-modal');
};

window.submitCheckout = async function (e) {
    e.preventDefault();
    if (!state.currentUser) return;

    const phone = document.getElementById('checkout-phone').value.trim();
    const notes = document.getElementById('checkout-notes').value.trim();
    const btn = document.getElementById('checkout-submit-btn');
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: state.currentUser.email,
                deliveryPhone: phone,
                notes
            })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || data.message || 'Checkout failed');
        }
        closeModal('checkout-modal');
        const oid = data.data && data.data.orderId ? data.data.orderId : '';
        showToast(oid ? `Order placed! ID: ${oid.slice(0, 8)}…` : 'Order placed successfully!', 'success');
        await syncCart();
    } catch (err) {
        showToast(err.message || 'Could not place order.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
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
