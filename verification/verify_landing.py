from playwright.sync_api import sync_playwright

def verify_landing():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000")
            page.goto("http://localhost:3000", timeout=30000)
            print("Loaded page")
            page.wait_for_selector(".hero-section")
            print("Found hero section")
            page.screenshot(path="verification/landing.png")
            print("Screenshot taken")
        except Exception as e:
            print(f"Error: {e}")
            # Take screenshot anyway if possible to debug
            try:
                page.screenshot(path="verification/error.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_landing()
