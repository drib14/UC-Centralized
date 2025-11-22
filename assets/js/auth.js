class Auth {
    static CURRENT_USER_KEY = 'ucc_current_user';
    static TOKEN_KEY = 'accessToken';

    static async login(studentId, password) {
        try {
            const data = await API.login(studentId, password);
            const { accessToken, ...user } = data;
            localStorage.setItem(this.TOKEN_KEY, accessToken);
            localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
            return user;
        } catch (err) {
            throw err;
        }
    }

    static async register(data) {
        try {
            return await API.register(data);
        } catch (err) {
            throw err;
        }
    }

    static logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
        window.location.href = '/login.html';
    }

    static getCurrentUser() {
        const user = localStorage.getItem(this.CURRENT_USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static isAuthenticated() {
        return !!localStorage.getItem(this.TOKEN_KEY);
    }

    // Legacy support if needed
    static requireAdmin() {
        this.checkSession();
        // The checkSession handles redirect, but if we want double check:
        const user = this.getCurrentUser();
        if (!user || user.role !== 'admin') {
            window.location.href = '/pages/student/dashboard.html';
        }
    }

    static checkSession() {
        const path = window.location.pathname;
        const isPublicPage = path.includes('login.html') || path.includes('register.html') || path === '/' || path.endsWith('index.html');
        const token = localStorage.getItem(this.TOKEN_KEY);

        if (!token && !isPublicPage) {
            window.location.href = '/login.html';
            return;
        }

        if (token) {
             const user = this.getCurrentUser();

             // Redirect logged in users away from auth pages
             if (path.includes('login.html') || path.includes('register.html')) {
                 if (user && user.role === 'admin') window.location.href = '/pages/admin/dashboard.html';
                 else window.location.href = '/pages/student/dashboard.html';
                 return;
             }

             // Role Guards
             if (path.includes('/pages/admin/') && (!user || user.role !== 'admin')) {
                 // Student trying to access admin page
                 window.location.href = '/pages/student/dashboard.html';
             }
        }
    }
}

window.Auth = Auth;

document.addEventListener('DOMContentLoaded', () => {
    Auth.checkSession();
});
