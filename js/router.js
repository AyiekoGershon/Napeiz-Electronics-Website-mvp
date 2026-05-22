// ===== SIMPLE CLIENT-SIDE ROUTER =====
// Manages navigation between store and admin portal without page reloads

const Router = {
    currentPath: '/',
    
    init() {
        this.currentPath = window.location.pathname;
        this.handleRoute();
        
        // Listen for popstate (back/forward buttons)
        window.addEventListener('popstate', () => this.handleRoute());
    },

    navigate(path) {
        this.currentPath = path;
        window.history.pushState(null, '', path);
        this.handleRoute();
    },

    handleRoute() {
        const path = window.location.pathname;
        
        // Show/hide store and admin sections
        const storeContent = document.getElementById('storeContent');
        const adminContent = document.getElementById('adminContent');
        
        if (path === '/admin' || path.includes('admin')) {
            if (storeContent) storeContent.style.display = 'none';
            if (adminContent) adminContent.style.display = 'block';
            this.initAdminPanel();
        } else {
            if (storeContent) storeContent.style.display = 'block';
            if (adminContent) adminContent.style.display = 'none';
            this.initStore();
        }
    },

    initStore() {
        // Initialize store if needed
        if (typeof window.initStore === 'function') {
            window.initStore();
        }
    },

    initAdminPanel() {
        // Check if already logged in
        if (DB.isLoggedIn()) {
            this.showAdminDashboard();
        } else {
            this.showAdminLogin();
        }
    },

    showAdminLogin() {
        const loginContainer = document.getElementById('adminLoginContainer');
        const dashboardContainer = document.getElementById('adminDashboardContainer');
        if (loginContainer) loginContainer.style.display = 'flex';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
    },

    showAdminDashboard() {
        const loginContainer = document.getElementById('adminLoginContainer');
        const dashboardContainer = document.getElementById('adminDashboardContainer');
        if (loginContainer) loginContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'block';
    },

    goToStore() {
        this.navigate('/');
    },

    goToAdmin() {
        this.navigate('/admin');
    }
};

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Router.init());
} else {
    Router.init();
}
