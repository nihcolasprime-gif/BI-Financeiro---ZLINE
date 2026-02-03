from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load the page
        print("Navigating to http://localhost:3000")
        page.goto("http://localhost:3000")

        # Wait for content to load
        page.wait_for_selector("text=BI Growth")
        time.sleep(2) # Animation wait

        # 2. Take screenshot of initial state (Privacy Mode Off? Default is false in App.tsx)
        # Check if privacy mode is on or off. Default is false.
        # Toggle privacy mode to see if masking works.

        print("Taking screenshot of default view")
        page.screenshot(path="/home/jules/verification/dashboard_default.png", full_page=True)

        # 3. Find Privacy Mode toggle and click it
        # The button has an eye icon. title="Ocultar Valores" or "Exibir Valores"
        # Initial state is values visible, so button title is "Ocultar Valores" (Privacy Mode Off -> we want to turn it On?)
        # Wait, if isPrivacyMode is false, we see Eye (open). Button title "Ocultar Valores".
        # If we click it, isPrivacyMode becomes true. EyeOff (crossed). Button title "Exibir Valores".

        toggle_btn = page.get_by_title("Ocultar Valores")
        if toggle_btn.is_visible():
            print("Clicking Privacy Toggle")
            toggle_btn.click()
            time.sleep(1)
            print("Taking screenshot of privacy mode")
            page.screenshot(path="/home/jules/verification/dashboard_privacy.png", full_page=True)
        else:
            print("Privacy Toggle not found or already in privacy mode")

        # 4. Check for OriginPieChart existence
        # It's in the 'growth_tools' tab.
        # Click "Estratégico" tab.
        print("Clicking 'Estratégico' tab")
        page.get_by_text("Estratégico").click()
        time.sleep(2)

        print("Taking screenshot of Strategy tab")
        page.screenshot(path="/home/jules/verification/dashboard_strategy.png", full_page=True)

        # Check for "Origem dos Clientes" text which is the title of the chart card
        if page.get_by_text("Origem dos Clientes").is_visible():
            print("Origin Pie Chart title found")
        else:
            print("Origin Pie Chart title NOT found")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
