import axios from 'axios';

// Uses relative /api by default in production or VITE_API_URL if configured
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

class API {
    static async request(endpoint, method = 'GET', body = null, isMultipart = false) {
        try {
            const headers = {};
            // DO NOT set Content-Type for multipart if using FormData, let Axios handle it with boundary
            if (isMultipart && !(body instanceof FormData)) {
                 // Fallback if not FormData (though likely error in usage)
                 // But strictly speaking, we shouldn't force it if axios detects object/json
            }

            // If body is FormData, axios automatically sets correct multipart header with boundary.
            // If we manually set it, we break it.

            const config = {
                method,
                url: endpoint,
                headers,
                data: body,
            };

            const response = await api(config);
            return response.data;
        } catch (err) {
            console.error("API Error:", err);
            // Return the error message from server if available
            if (err.response && err.response.data) {
                // Sometimes server returns { message: "..." } or just string
                const message = err.response.data.message || err.response.data;
                throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
            }
            throw err;
        }
    }

    // Auth
    static login(identifier, password) {
        return this.request('/auth/login', 'POST', { studentId: identifier, identifier, password });
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

    static updateEvent(id, formData) {
        return this.request(`/events/${id}`, 'PUT', formData, true);
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

    static updateMerch(id, formData) {
        return this.request(`/merch/${id}`, 'PUT', formData, true);
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
    static getAnnouncements(params) {
        let endpoint = '/announcements';
        if (params && typeof params === 'object') {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    searchParams.append(key, val);
                }
            });
            const qs = searchParams.toString();
            if (qs) endpoint += `?${qs}`;
        }
        return this.request(endpoint);
    }

    static createAnnouncement(data) {
        return this.request('/announcements', 'POST', data);
    }

    static updateAnnouncement(id, data) {
        return this.request(`/announcements/${id}`, 'PUT', data);
    }

    static deleteAnnouncement(id) {
        return this.request(`/announcements/${id}`, 'DELETE');
    }

    // Admin Stats
    static getAdminStats() {
        return this.request('/stats/dashboard');
    }

    // Departments
    static getDepartments() {
        return this.request('/departments');
    }

    static getAllDepartments() {
        return this.request('/departments/all');
    }

    static createDepartment(data) {
        return this.request('/departments', 'POST', data);
    }

    static updateDepartment(id, data) {
        return this.request(`/departments/${id}`, 'PUT', data);
    }

    static deleteDepartment(id) {
        return this.request(`/departments/${id}`, 'DELETE');
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

    // Search
    static searchUsers(query) {
        return this.request(`/users/search?q=${query}`);
    }

    // Messages
    static getConversations() {
        return this.request('/messages/conversations');
    }

    static getUnreadMessageCount() {
        return this.request('/messages/unread-count');
    }

    static deleteConversation(id) {
        return this.request(`/messages/conversations/${id}`, 'DELETE');
    }

    static muteConversation(id) {
        return this.request(`/messages/conversations/${id}/mute`, 'PUT');
    }

    static getMessages(conversationId) {
        return this.request(`/messages/conversations/${conversationId}`);
    }

    static createConversation(receiverId) {
        return this.request('/messages/conversations', 'POST', { receiverId });
    }

    static sendMessage(conversationId, content, type = 'text', fileUrl = null, attachments = []) {
        return this.request('/messages', 'POST', { conversationId, content, type, fileUrl, attachments });
    }

    static editMessage(id, content) {
        return this.request(`/messages/${id}`, 'PUT', { content });
    }

    static deleteMessage(id, mode = 'me') {
        return this.request(`/messages/${id}?mode=${mode}`, 'DELETE');
    }

    static toggleReaction(id, emoji) {
        return this.request(`/messages/${id}/react`, 'PUT', { emoji });
    }

    static getBlockStatus(userId) {
        return this.request(`/users/${userId}/block-status`);
    }

    static uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request('/messages/upload', 'POST', formData, true);
    }

    static markMessagesRead(conversationId) {
        return this.request(`/messages/conversations/${conversationId}/read`, 'PUT');
    }

    // Notifications
    static getNotifications() {
        return this.request('/notifications');
    }

    static markNotificationRead(id) {
        return this.request(`/notifications/${id}/read`, 'PUT');
    }

    static markAllNotificationsRead() {
        return this.request('/notifications/read-all', 'PUT');
    }

    static deleteNotification(id) {
        return this.request(`/notifications/${id}`, 'DELETE');
    }

    static deleteAllNotifications() {
        return this.request('/notifications', 'DELETE');
    }

    static sendTestEmail() {
        return this.request('/notifications/test-email', 'POST');
    }

    // User Actions
    static blockUser(id) {
        return this.request(`/users/${id}/block`, 'PUT');
    }

    static unblockUser(id) {
        return this.request(`/users/${id}/unblock`, 'PUT');
    }

    static getMyDetails() {
        return this.request('/users/me/details');
    }

    // Generic Methods helpers for convenience (since ChatWindow uses API.post/put/get)
    static get(endpoint) {
        return this.request(endpoint, 'GET');
    }

    static post(endpoint, body) {
        return this.request(endpoint, 'POST', body);
    }

    static put(endpoint, body) {
        return this.request(endpoint, 'PUT', body);
    }

    static delete(endpoint) {
        return this.request(endpoint, 'DELETE');
    }
}

export default API;
