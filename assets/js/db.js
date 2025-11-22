// Database Manager for UC-Central
// Handles initialization of mock data and LocalStorage persistence

class DB {
    static KEYS = {
        INIT: 'ucc_data_initialized',
        EVENTS: 'ucc_events',
        MERCH: 'ucc_merch',
        DEPTS: 'ucc_depts',
        ANNOUNCEMENTS: 'ucc_announcements',
        ORDERS: 'ucc_orders',
        RSVPS: 'ucc_rsvps',
        MESSAGES: 'ucc_messages'
    };

    static init() {
        if (!localStorage.getItem(this.KEYS.INIT)) {
            console.log("Initializing LocalStorage with Mock Data...");

            // Check if MockData exists (loaded from mock-data.js)
            if (window.MockData) {
                localStorage.setItem(this.KEYS.EVENTS, JSON.stringify(window.MockData.events));
                localStorage.setItem(this.KEYS.MERCH, JSON.stringify(window.MockData.merch));
                localStorage.setItem(this.KEYS.DEPTS, JSON.stringify(window.MockData.departments));

                // Announcements were in mock-data but maybe not exposed as cleanly, let's grab them or default
                const initialAnnouncements = [
                     { id: 1, title: "Midterm Examination Schedule", message: "The midterm examination schedule for the 1st Semester A.Y. 2024-2025 has been released.", date: "2024-10-01", author: "Admin", dept: "ALL" },
                     { id: 2, title: "No Classes - Holiday", message: "Please be advised that there will be no classes on Monday due to the National Holiday.", date: "2024-10-05", author: "Admin", dept: "ALL" }
                ];
                localStorage.setItem(this.KEYS.ANNOUNCEMENTS, JSON.stringify(initialAnnouncements));
            }

            localStorage.setItem(this.KEYS.ORDERS, JSON.stringify([]));
            localStorage.setItem(this.KEYS.RSVPS, JSON.stringify([]));
            localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify([]));
            localStorage.setItem(this.KEYS.INIT, 'true');
        }
    }

    // Generic Get/Set
    static getData(key) {
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    static setData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // --- Departments ---
    static getDepts() { return this.getData(this.KEYS.DEPTS); }

    // --- Events ---
    static getEvents() { return this.getData(this.KEYS.EVENTS); }
    static addEvent(event) {
        const list = this.getEvents();
        event.id = Date.now(); // Simple ID
        list.push(event);
        this.setData(this.KEYS.EVENTS, list);
        return event;
    }

    // --- Merch ---
    static getMerch() { return this.getData(this.KEYS.MERCH); }
    static addMerch(item) {
        const list = this.getMerch();
        item.id = Date.now();
        list.push(item);
        this.setData(this.KEYS.MERCH, list);
        return item;
    }

    // --- Announcements ---
    static getAnnouncements() { return this.getData(this.KEYS.ANNOUNCEMENTS); }
    static addAnnouncement(item) {
        const list = this.getAnnouncements();
        item.id = Date.now();
        item.date = new Date().toISOString().split('T')[0];
        list.unshift(item); // Newest first
        this.setData(this.KEYS.ANNOUNCEMENTS, list);
        return item;
    }

    // --- Orders ---
    static getOrders() { return this.getData(this.KEYS.ORDERS); }
    static addOrder(order) {
        const list = this.getOrders();
        order.id = 'ORD-' + Date.now().toString().slice(-6);
        order.date = new Date().toISOString();
        order.status = 'Pending';
        list.unshift(order);
        this.setData(this.KEYS.ORDERS, list);
        return order;
    }
    static updateOrderStatus(orderId, status) {
        const list = this.getOrders();
        const order = list.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            this.setData(this.KEYS.ORDERS, list);
        }
    }

    // --- RSVPs ---
    static getRSVPs() { return this.getData(this.KEYS.RSVPS); }
    static addRSVP(studentId, eventId) {
        const list = this.getRSVPs();
        if (!list.find(r => r.studentId === studentId && r.eventId === eventId)) {
            list.push({ studentId, eventId, date: new Date().toISOString() });
            this.setData(this.KEYS.RSVPS, list);
            return true;
        }
        return false;
    }
    static hasRSVPd(studentId, eventId) {
        const list = this.getRSVPs();
        return !!list.find(r => r.studentId === studentId && r.eventId === eventId);
    }

    // --- Messages ---
    static getMessages() { return this.getData(this.KEYS.MESSAGES); }
    static addMessage(msg) {
        const list = this.getMessages();
        msg.id = Date.now();
        msg.date = new Date().toISOString();
        list.unshift(msg);
        this.setData(this.KEYS.MESSAGES, list);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    DB.init();
});

window.DB = DB;
