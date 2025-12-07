const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function run() {
    try {
        console.log("1. Login/Register...");
        let token;
        const email = `testuser${Date.now()}@test.com`;

        try {
            // Try to register first
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                firstName: 'Test',
                lastName: 'Searcher',
                studentId: `${Date.now()}`.substring(0, 10), // Ensure numeric and reasonable length
                email: email,
                password: 'Password123!',
                confirmPassword: 'Password123!',
                department: 'CCS'
            }, { timeout: 15000 });
            token = regRes.data.accessToken;
            console.log("Registered. Token obtained.");
        } catch (e) {
            console.log("Registration failed, trying login (maybe exists).", e.response?.data || e.message);
            // Login fallback not implemented for this random email
        }

        if (!token) return;

        console.log("2. Searching for users...");
        // Search for 'a' - should return many users
        const res = await axios.get(`${API_URL}/messages/search/users?q=a`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000
        });

        console.log(`Found ${res.data.length} users.`);
        if (res.data.length > 0) {
            console.log("Sample user:", res.data[0]);
        } else {
            console.log("No users found. Debugging...");
            // Try searching specifically for the user created
            const selfRes = await axios.get(`${API_URL}/auth/me`, {
                 headers: { Authorization: `Bearer ${token}` },
                 timeout: 15000
            });
            console.log("My Profile:", selfRes.data);
        }

    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}

run();
