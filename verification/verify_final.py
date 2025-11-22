from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    # --- Test 1: Admin Login with new ID ---
    print("Navigating to Login...")
    page.goto("http://localhost:8000/login.html")

    # Check title
    title = page.title()
    print(f"Page Title: {title}")
    assert title == "UC-Central"

    # Check Input Type
    type_attr = page.get_attribute("#studentId", "type")
    assert type_attr == "number"
    print("Input type verified as number.")

    print("Logging in with numeric Admin ID 2222...")
    page.fill("#studentId", "2222")
    page.fill("#password", "admin123")
    page.click("button[type='submit']")
    page.wait_for_url("**/pages/admin/dashboard.html")
    print("Admin Logged in.")

    # --- Test 2: User Management ---
    print("Navigating to User Management...")
    page.click("a[href='users.html']")
    page.wait_for_selector("h2:has-text('User Management')")

    # Add new admin
    print("Adding new Admin...")
    page.click("button[data-bs-target='#addUserModal']")
    page.fill("#u-id", "3333")
    page.fill("#u-fname", "Mini")
    page.fill("#u-lname", "Admin")
    page.fill("#u-pass", "pass")
    page.click("button[onclick='addAdminUser()']")

    # Check for Toast and New Row
    page.wait_for_selector(".toast-body:has-text('Admin added successfully')")
    print("Toast appeared.")

    # Verify Toast Icon (FontAwesome)
    if page.locator(".toast-body .fa-circle-check").count() > 0:
        print("Toast has check icon.")
    else:
        print("Toast MISSING check icon.")

    page.wait_for_selector("td:has-text('3333')")
    print("New Admin appeared in table.")

    page.screenshot(path="verification/11_user_management.png")

    # --- Test 3: Favicon check ---
    # Hard to check visually in headless, but can check DOM
    favicon = page.locator("link[rel='icon']").get_attribute("href")
    if favicon and "data:image/svg+xml" in favicon:
        print("Favicon SVG detected.")
    else:
        print("Favicon missing or incorrect.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
