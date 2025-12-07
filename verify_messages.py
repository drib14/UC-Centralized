from playwright.sync_api import sync_playwright, expect
import time

def verify_messages():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Register a new user (Since DB connection for seeding failed, UI registration is safer)
            # Use a unique email every time to avoid conflicts if DB persists
            timestamp = int(time.time())
            email = f"testuser{timestamp}@test.com"

            print("Navigating to register page...")
            page.goto("http://localhost:5173/register")

            print(f"Registering user: {email}")
            page.fill("input[name='firstName']", "Test")
            page.fill("input[name='lastName']", "User")
            page.fill("input[name='studentId']", f"12{timestamp}") # ensure unique ID
            page.fill("input[name='email']", email)
            page.fill("input[name='password']", "Password123!")
            page.fill("input[name='confirmPassword']", "Password123!")

            # Select dropdowns if they exist (Department, Program, Year)
            # Assuming defaults or simple select
            # Check if department select exists
            if page.locator("select[name='department']").count() > 0:
                 page.select_option("select[name='department']", "CCS")

            page.click("button[type='submit']")

            # Wait for navigation to login or dashboard
            # If it goes to login
            print("Waiting for redirection...")
            page.wait_for_url("**/login", timeout=10000)

            # Login
            print("Logging in...")
            page.fill("input[name='email']", email)
            page.fill("input[name='password']", "Password123!")
            page.click("button[type='submit']")

            # Wait for dashboard
            page.wait_for_url("**/student/dashboard", timeout=15000)
            print("Logged in successfully.")

            # Navigate to Messages
            print("Navigating to Messages...")
            page.click("a[href='/student/messages']")

            # Verify Messages Page Elements
            print("Verifying UI...")
            page.wait_for_selector("text=Messages")
            expect(page.get_by_text("Welcome to Messages")).to_be_visible()

            # Check Sidebar search
            expect(page.get_by_placeholder("Search chats...")).to_be_visible()

            # Check New Chat button
            page.click("button[title='New Message']")
            expect(page.get_by_text("New Message")).to_be_visible()
            expect(page.get_by_placeholder("Type name or email to search...")).to_be_visible()

            # Close modal
            page.click(".btn-close")

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="/home/jules/verification/messages_page.png")
            print("Screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_messages()
