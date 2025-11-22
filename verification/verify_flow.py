from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    # 1. Go to Login Page
    print("Navigating to login...")
    page.goto("http://localhost:8000/login.html")
    page.screenshot(path="verification/01_login.png")

    # 2. Login as Student
    print("Logging in...")

    page.goto("http://localhost:8000/register.html")
    page.fill("#firstName", "John")
    page.fill("#lastName", "Doe")
    page.fill("#studentId", "20240001")

    # Wait for department options to be in the DOM
    # We use state='attached' because <option> inside <select> might not be considered "visible"
    page.wait_for_selector("#department option[value='CICT']", state="attached")

    page.select_option("#department", "CICT")

    page.select_option("#year", "3")
    page.fill("#program", "BSIT")
    page.fill("#password", "password123")
    page.fill("#confirmPassword", "password123")

    page.click("button[type='submit']")

    # Wait for redirection to login
    page.wait_for_url("**/login.html")
    print("Registration complete.")

    # 3. Login
    page.fill("#studentId", "20240001")
    page.fill("#password", "password123")
    page.click("button[type='submit']")

    # Wait for dashboard
    page.wait_for_url("**/pages/student/dashboard.html")
    print("Logged in. Taking dashboard screenshot...")
    page.screenshot(path="verification/02_dashboard.png")

    # 4. Go to Merch
    page.click("a[href='merch.html']")
    page.wait_for_url("**/pages/student/merch.html")
    print("On Merch page. Taking screenshot...")
    page.screenshot(path="verification/03_merch.png")

    # 5. Add to Cart (First item)
    # Wait for items to load
    page.wait_for_selector(".card button")
    page.click(".card button") # Clicks first add to cart button

    # 6. Go to Cart
    # There are two links to cart (nav and icon), pick one.
    # The nav link text "Merch Store" is active, let's find the cart icon link.
    # It has href='cart.html'
    page.click("a[href='cart.html']")
    page.wait_for_url("**/pages/student/cart.html")
    print("On Cart page. Taking screenshot...")
    page.screenshot(path="verification/04_cart.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
