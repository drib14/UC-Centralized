const router = require('express').Router();

router.get('/', (req, res) => {
    res.json({
        intro: "Welcome to the UC-Central API. This API provides access to the school management system's core features including Users, Events, Merchandise, Orders, and Announcements.",
        authentication: {
            methods: ["JWT Token", "API Key (x-api-key header)"],
            endpoints: [
                { method: "POST", url: "/auth/login", description: "Login with Student ID and Password" },
                { method: "POST", url: "/auth/register", description: "Register a new account" }
            ]
        },
        resources: {
            users: {
                endpoints: [
                    { method: "GET", url: "/users", description: "Get all users (Admin only)" },
                    { method: "GET", url: "/auth/me", description: "Get current user profile" }
                ],
                schema: {
                    studentId: "String (Required, Unique)",
                    email: "String (Required, Unique)",
                    firstName: "String",
                    lastName: "String",
                    role: "String (student|admin)"
                }
            },
            events: {
                endpoints: [
                    { method: "GET", url: "/events", description: "Get all events" },
                    { method: "POST", url: "/events", description: "Create a new event (Admin only)" }
                ],
                schema: {
                    title: "String",
                    date: "String",
                    location: "String",
                    attendees: "[ObjectId (Ref: User)]"
                }
            },
            merch: {
                endpoints: [
                    { method: "GET", url: "/merch", description: "Get all merchandise items" }
                ],
                schema: {
                    name: "String",
                    price: "Number",
                    stock: "Number",
                    category: "String",
                    variants: "[{ size, color, stock }]"
                }
            },
            orders: {
                endpoints: [
                    { method: "GET", url: "/orders", description: "Get all orders" },
                    { method: "POST", url: "/orders", description: "Create a new order" }
                ],
                schema: {
                    user: "ObjectId (Ref: User)",
                    items: "[{ merch, quantity, variant }]",
                    totalPrice: "Number",
                    status: "String"
                }
            },
            announcements: {
                endpoints: [
                    { method: "GET", url: "/announcements", description: "Get all announcements" }
                ]
            }
        }
    });
});

module.exports = router;
