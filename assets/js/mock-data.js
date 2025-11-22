// Mock Data for UC-Central

const MOCK_DEPARTMENTS = [
    { id: 'CICT', name: 'College of Information & Communication Technology' },
    { id: 'CBA', name: 'College of Business Administration' },
    { id: 'COE', name: 'College of Engineering' },
    { id: 'CAS', name: 'College of Arts and Sciences' },
    { id: 'CRIM', name: 'College of Criminology' },
    { id: 'NURSING', name: 'College of Nursing' }
];

const MOCK_EVENTS = [
    {
        id: 1,
        title: "Techno-Fest 2024",
        date: "2024-10-15",
        time: "08:00 AM",
        venue: "University Gymnasium",
        description: "Annual showcase of technology and innovation projects.",
        department: "CICT",
        image: "https://placehold.co/600x400?text=Techno-Fest"
    },
    {
        id: 2,
        title: "Business Week Opening",
        date: "2024-11-01",
        time: "09:00 AM",
        venue: "Main Audi",
        description: "Kickoff for the Business Administration week.",
        department: "CBA",
        image: "https://placehold.co/600x400?text=Business+Week"
    },
    {
        id: 3,
        title: "General Assembly",
        date: "2024-09-20",
        time: "01:00 PM",
        venue: "Covered Court",
        description: "Mandatory assembly for all students.",
        department: "ALL",
        image: "https://placehold.co/600x400?text=General+Assembly"
    }
];

const MOCK_MERCH = [
    {
        id: 101,
        name: "CICT Department Shirt",
        price: 350.00,
        category: "Shirt",
        department: "CICT",
        image: "https://placehold.co/300x300?text=CICT+Shirt"
    },
    {
        id: 102,
        name: "UC Lanyard",
        price: 150.00,
        category: "Accessories",
        department: "ALL",
        image: "https://placehold.co/300x300?text=UC+Lanyard"
    },
    {
        id: 103,
        name: "CBA Hoodie",
        price: 850.00,
        category: "Hoodie",
        department: "CBA",
        image: "https://placehold.co/300x300?text=CBA+Hoodie"
    },
    {
        id: 104,
        name: "Engineering Cap",
        price: 250.00,
        category: "Accessories",
        department: "COE",
        image: "https://placehold.co/300x300?text=COE+Cap"
    }
];

const MOCK_NOTIFICATIONS = [
    { id: 1, title: "New Event", message: "Techno-Fest 2024 registration is now open!", time: "2 hours ago", read: false },
    { id: 2, title: "Order Update", message: "Your order #12345 is ready for pickup.", time: "1 day ago", read: true }
];

// Expose data globally if using simple script tags
window.MockData = {
    departments: MOCK_DEPARTMENTS,
    events: MOCK_EVENTS,
    merch: MOCK_MERCH,
    notifications: MOCK_NOTIFICATIONS
};
