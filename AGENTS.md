# UC-Central Architecture

## Overview
UC-Central is a school organization web application built with:
- **Frontend:** Vanilla HTML, CSS (Bootstrap 5 + Custom Mint Green Theme), Vanilla JavaScript.
- **Data Persistence:** `localStorage` is used for user authentication and session management.
- **Mock Data:** Static data for Departments, Events, and Merch is defined in `assets/js/mock-data.js`.

## File Structure
- `/index.html`: Landing page.
- `/login.html`, `/register.html`: Auth pages.
- `/pages/student/`: Student-facing pages (Dashboard, Merch, Events).
- `/pages/admin/`: Admin-facing pages (Dashboard, Orders).
- `/assets/js/`:
  - `auth.js`: Handles Login, Register, Logout, and Session checks.
  - `mock-data.js`: Contains the static data for the app.
  - `main.js`: UI utilities (Toasts, Currency formatting) and shared logic.
- `/assets/css/`:
  - `styles.css`: Custom styles and Mint Green theme overrides.

## Coding Conventions
- **DOM Manipulation:** Use `document.getElementById` or `querySelector`.
- **Event Listeners:** Attached in `main.js` or specific page scripts.
- **Styling:** Use Bootstrap classes first, then custom CSS for branding.
- **Icons:** FontAwesome classes (e.g., `fa-solid fa-user`).
