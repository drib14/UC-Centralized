from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    # Capture logs
    page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    # --- Admin Flow ---
    print("Navigating to Admin Login...")
    page.goto("http://localhost:8000/login.html")
    page.fill("#studentId", "admin")
    page.fill("#password", "admin123")
    page.click("button[type='submit']")
    page.wait_for_url("**/pages/admin/dashboard.html")
    print("Admin Logged in.")

    # Create Event
    print("Creating Event...")
    page.click("a[href='events.html']")
    page.wait_for_selector("button[data-bs-target='#createEventModal']")
    page.click("button[data-bs-target='#createEventModal']")

    # Fill form
    page.fill("#event-title", "Grand Summit")
    page.fill("#event-date", "2024-12-25")
    page.fill("#event-time", "10:00")
    page.fill("#event-venue", "Main Hall")
    page.fill("#event-desc", "A very grand summit.")

    # Click Publish (Primary Button)
    # Using a forceful click or check if it's intercepted
    page.click("button.btn-primary:has-text('Publish Event')")

    # Verify directly without reload first to see if JS ran
    try:
        page.wait_for_selector("h5:has-text('Grand Summit')", timeout=3000)
        print("Event Appeared immediately.")
    except:
        print("Event did not appear immediately.")

    # Reload page to check persistence
    page.reload()

    # Verify Event Appears
    try:
        page.wait_for_selector("h5:has-text('Grand Summit')", timeout=5000)
        print("Event Created Successfully (Persisted).")
    except:
        print("Event NOT found after reload.")
        raise

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
