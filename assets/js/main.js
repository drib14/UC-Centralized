// Main JS for UC-Central

// --- Constants & Utils ---
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

function formatCurrency(amount) {
    return CURRENCY_FORMATTER.format(amount);
}

// --- Toast Notification ---
// Requires a toast container in the HTML
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'text-bg-success' : 'text-bg-danger';
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check me-2"></i>' : '<i class="fa-solid fa-circle-exclamation me-2"></i>';

    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
            <div class="d-flex">
                <div class="toast-body fs-6">
                    ${icon} ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = toastHTML;
    container.appendChild(wrapper.firstElementChild);

    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();

    // Cleanup after hide
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// --- Cart Logic (Helper) ---
// Simple Cart implementation using localStorage
class Cart {
    static KEY = 'ucc_cart';

    static getItems() {
        const cart = localStorage.getItem(this.KEY);
        return cart ? JSON.parse(cart) : [];
    }

    static addItem(product) {
        const items = this.getItems();
        const existing = items.find(i => i.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            items.push({ ...product, quantity: 1 });
        }
        localStorage.setItem(this.KEY, JSON.stringify(items));
        // Dispatch event for UI updates
        window.dispatchEvent(new Event('cartUpdated'));
    }

    static removeItem(productId) {
        let items = this.getItems();
        items = items.filter(i => i.id !== productId);
        localStorage.setItem(this.KEY, JSON.stringify(items));
        window.dispatchEvent(new Event('cartUpdated'));
    }

    static updateQuantity(productId, quantity) {
        let items = this.getItems();
        const index = items.findIndex(i => i.id === productId);
        if (index !== -1) {
            if (quantity <= 0) {
                items = items.filter(i => i.id !== productId);
            } else {
                items[index].quantity = parseInt(quantity);
            }
            localStorage.setItem(this.KEY, JSON.stringify(items));
            window.dispatchEvent(new Event('cartUpdated'));
        }
    }

    static clear() {
        localStorage.removeItem(this.KEY);
        window.dispatchEvent(new Event('cartUpdated'));
    }

    static getTotal() {
        const items = this.getItems();
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    static getCount() {
        const items = this.getItems();
        return items.reduce((sum, item) => sum + item.quantity, 0);
    }
}

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    updateCartBadge();

    // Listen for cart updates
    window.addEventListener('cartUpdated', updateCartBadge);
});

function updateNav() {
    const user = window.Auth ? window.Auth.getCurrentUser() : null;
    const authLinks = document.getElementById('auth-links');
    const userLinks = document.getElementById('user-links');
    const adminLinks = document.getElementById('admin-links');

    if (authLinks && userLinks) {
        if (user) {
            authLinks.classList.add('d-none');
            userLinks.classList.remove('d-none');

            // Update Username display
            const userNameDisplay = document.getElementById('nav-user-name');
            if(userNameDisplay) {
                 // Handle firstName or name or fallback
                 const displayName = user.firstName || (user.name ? user.name.split(' ')[0] : 'Student');
                 userNameDisplay.textContent = `Hi, ${displayName}`;
            }

            // Admin Check
            if (user.role === 'admin' && adminLinks) {
                adminLinks.classList.remove('d-none');
            }
        } else {
            authLinks.classList.remove('d-none');
            userLinks.classList.add('d-none');
            if(adminLinks) adminLinks.classList.add('d-none');
        }
    }

    // Logout Handler
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.Auth.logout();
        });
    }
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const count = Cart.getCount();
        badge.textContent = count;
        badge.classList.toggle('d-none', count === 0);
    }
}

// Expose
window.Cart = Cart;
window.showToast = showToast;
window.formatCurrency = formatCurrency;

// Sidebar Toggle Logic
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('page-content-wrapper');
    const isMobile = window.innerWidth <= 768;

    if(sidebar && content) {
        if (isMobile) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
            localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
        }
        updateToggleIcon();
    }
}

function updateToggleIcon() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebar-toggle');
    if(!sidebar || !btn) return;

    const isMobile = window.innerWidth <= 768;
    const icon = btn.querySelector('i');
    if(!icon) return;

    if (isMobile) {
        // Mobile: Active means visible (Open). We show Left arrow to close it.
        // Hidden (Default): We show Right arrow to open it.
        if (sidebar.classList.contains('active')) {
            icon.className = 'fa-solid fa-chevron-left';
        } else {
            icon.className = 'fa-solid fa-chevron-right';
        }
    } else {
        // Desktop: Collapsed means small. Right arrow to expand.
        // Expanded: Left arrow to collapse.
        if (sidebar.classList.contains('collapsed')) {
            icon.className = 'fa-solid fa-chevron-right';
        } else {
            icon.className = 'fa-solid fa-chevron-left';
        }
    }
}

function injectSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (document.getElementById('sidebar-toggle')) return;

    const btn = document.createElement('div');
    btn.id = 'sidebar-toggle';
    btn.className = 'sidebar-toggle-btn';
    btn.onclick = toggleSidebar;
    btn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    sidebar.appendChild(btn);

    updateToggleIcon();
}

document.addEventListener('DOMContentLoaded', () => {
    injectSidebarToggle();

    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('page-content-wrapper');

    // Apply persisted state only on desktop or verify logic
    if(sidebar && content && isCollapsed && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
        content.classList.add('collapsed');
    }

    updateToggleIcon();
    window.addEventListener('resize', updateToggleIcon);
});
