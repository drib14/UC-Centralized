import axios from 'axios';

// Proxy in package.json handles the domain
const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
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
            if (isMultipart) {
                headers['Content-Type'] = 'multipart/form-data';
            }
            // Axios automatically sets Content-Type: application/json for objects/JSON

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

    static generateApiKey() {
        return this.request('/auth/generate-api-key', 'POST');
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
    static getAnnouncements() {
        return this.request('/announcements');
    }

    static createAnnouncement(data) {
        return this.request('/announcements', 'POST', data);
    }

    static deleteAnnouncement(id) {
        return this.request(`/announcements/${id}`, 'DELETE');
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
        return this.request(`/messages/${conversationId}`);
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
        return this.request(`/messages/${conversationId}/read`, 'PUT');
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
}

export default API;
