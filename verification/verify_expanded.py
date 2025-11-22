from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    # --- Admin Flow ---
    print("Navigating to Admin Login...")
    page.goto("http://localhost:8000/login.html")
    page.fill("#studentId", "admin")
    page.fill("#password", "admin123")
    page.click("button[type='submit']")
    page.wait_for_url("**/pages/admin/dashboard.html")
    print("Admin Logged in.")

    # Create Announcement
    print("Creating Announcement...")
    page.click("a[href='announcements.html']")
    page.wait_for_selector("button[data-bs-target='#addAnnModal']")
    page.click("button[data-bs-target='#addAnnModal']")
    page.fill("#a-title", "System Update")
    page.fill("#a-msg", "We have updated the system with new features.")
    page.click("button[onclick='saveAnnouncement()']")
    page.wait_for_selector("h5:has-text('System Update')")
    page.screenshot(path="verification/05_admin_announcements.png")

    # Create Product
    print("Creating Product...")
    page.click("a[href='merch.html']")
    page.wait_for_selector("button[data-bs-target='#addMerchModal']")
    page.click("button[data-bs-target='#addMerchModal']")
    page.fill("#m-name", "New Tee")
    page.fill("#m-price", "500")
    page.click("button[onclick='saveMerch()']")
    page.wait_for_selector("h6:has-text('New Tee')")
    page.screenshot(path="verification/06_admin_merch.png")

    page.click("#logout-btn")

    # --- Student Flow ---
    print("Navigating to Student Login...")
    # Need to register again because LocalStorage might be isolated per context?
    # Actually Playwright context persists within run() unless specified.
    # But db.js initializes separate from session.
    # We'll use the user registered in previous step if existing, or register new.
    # Let's register "Student2" to be safe.

    page.goto("http://localhost:8000/register.html")
    page.fill("#firstName", "Jane")
    page.fill("#lastName", "Doe")
    page.fill("#studentId", "20249999")
    page.wait_for_selector("#department option[value='CICT']", state="attached")
    page.select_option("#department", "CICT")
    page.select_option("#year", "3")
    page.fill("#program", "BSIT")
    page.fill("#password", "password")
    page.fill("#confirmPassword", "password")
    page.click("button[type='submit']")
    page.wait_for_url("**/login.html")

    page.fill("#studentId", "20249999")
    page.fill("#password", "password")
    page.click("button[type='submit']")
    page.wait_for_url("**/pages/student/dashboard.html")
    print("Student Logged In.")

    # Check for Announcement
    print("Checking Dashboard for Announcement...")
    page.wait_for_selector("h5:has-text('System Update')")
    page.screenshot(path="verification/07_student_dashboard_announcement.png")

    # Send Message
    print("Sending Message...")
    page.click("a[href='messages.html']")
    page.click("button[data-bs-target='#msgModal']")
    page.fill("#msg-subj", "Help")
    page.fill("#msg-body", "I need help.")
    page.click("button[onclick='sendMessage()']")
    page.wait_for_selector("h5:has-text('Help')")
    page.screenshot(path="verification/08_student_messages.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
