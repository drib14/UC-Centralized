const API_URL = 'http://localhost:5000';

class API {
    static async request(endpoint, method = 'GET', body = null, isMultipart = false) {
        const token = localStorage.getItem('accessToken');
        const headers = {};

        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
        };

        if (body) {
            config.body = isMultipart ? body : JSON.stringify(body);
        }

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);

            // Handle non-JSON responses (e.g. 404 from server not sending json)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || data || 'Something went wrong');
                }
                return data;
            } else {
                if (!res.ok) throw new Error(res.statusText);
                return await res.text();
            }
        } catch (err) {
            console.error("API Error:", err);
            throw err;
        }
    }

    // Auth
    static login(studentId, password) {
        return this.request('/auth/login', 'POST', { studentId, password });
    }

    static register(data) {
        return this.request('/auth/register', 'POST', data);
    }

    static getMe() {
        return this.request('/auth/me');
    }

    static updateProfile(data) {
        return this.request('/auth/profile', 'PUT', data);
    }

    // Events
    static getEvents() {
        return this.request('/events');
    }

    static createEvent(formData) {
        return this.request('/events', 'POST', formData, true);
    }

    static deleteEvent(id) {
        return this.request(`/events/${id}`, 'DELETE');
    }

    static rsvpEvent(id) {
        return this.request(`/events/${id}/rsvp`, 'POST');
    }

    // Merch
    static getMerch() {
        return this.request('/merch');
    }

    static createMerch(formData) {
        return this.request('/merch', 'POST', formData, true);
    }

    static deleteMerch(id) {
        return this.request(`/merch/${id}`, 'DELETE');
    }

    // Orders
    static createOrder(orderData) {
        return this.request('/orders', 'POST', orderData);
    }

    static getOrders() {
        return this.request('/orders');
    }

    static updateOrderStatus(id, status) {
        return this.request(`/orders/${id}`, 'PUT', { status });
    }

    // Announcements
    static getAnnouncements() {
        return this.request('/announcements');
    }

    static createAnnouncement(data) {
        return this.request('/announcements', 'POST', data);
    }

    // Admin Stats
    static getAdminStats() {
        return this.request('/stats/dashboard');
    }

    // Users
    static getUsers() {
        return this.request('/users');
    }

    static updateUser(id, data) {
        return this.request(`/users/${id}`, 'PUT', data);
    }

    static deleteUser(id) {
        return this.request(`/users/${id}`, 'DELETE');
    }
}

window.API = API;
