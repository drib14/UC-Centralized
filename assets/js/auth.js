// Auth Logic for UC-Central

class Auth {
    static USERS_KEY = 'ucc_users';
    static CURRENT_USER_KEY = 'ucc_current_user';

    static getUsers() {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : [];
    }

    static saveUser(user) {
        const users = this.getUsers();
        // Basic duplicate check
        if (users.find(u => u.studentId === user.studentId)) {
            throw new Error("Student ID already exists.");
        }
        users.push(user);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }

    static login(studentId, password) {
        // Admin backdoor for testing (Numeric ID now)
        if (studentId === '2222' && password === 'admin123') {
            const adminUser = {
                studentId: '2222',
                firstName: 'Super',
                lastName: 'Admin',
                role: 'admin'
            };
            localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(adminUser));
            return adminUser;
        }

        const users = this.getUsers();
        const user = users.find(u => u.studentId === studentId && u.password === password);

        if (user) {
            // Don't store password in session
            const { password, ...safeUser } = user;
            localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(safeUser));
            return safeUser;
        } else {
            throw new Error("Invalid Student ID or Password.");
        }
    }

    static logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        window.location.href = '/login.html'; // Adjust path as needed based on deployment
    }

    static getCurrentUser() {
        const user = localStorage.getItem(this.CURRENT_USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static requireLogin() {
        if (!this.getCurrentUser()) {
            window.location.href = '/login.html';
        }
    }

    static requireAdmin() {
        const user = this.getCurrentUser();
        if (!user || user.role !== 'admin') {
            window.location.href = '/login.html'; // Or unauthorized page
        }
    }

    static updateUser(updatedUser) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.studentId === updatedUser.studentId);
        if (index !== -1) {
            users[index] = updatedUser;
            localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

            // If updating current user session
            const current = this.getCurrentUser();
            if (current && current.studentId === updatedUser.studentId) {
                // Remove password before session store just in case
                const { password, ...safeUser } = updatedUser;
                localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(safeUser));
            }
            return true;
        }
        return false;
    }
}

// Expose globally
window.Auth = Auth;
