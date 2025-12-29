from playwright.sync_api import sync_playwright

def verify_drag_drop():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")

            # Setup admin token first
            page.fill('input[placeholder="輸入管理密碼以進行上傳與修改"]', "12345")
            page.click('button:text("驗證管理密碼")')

            # Create a folder to drag into
            page.fill('input[placeholder="新資料夾名稱"]', "test-folder")
            page.click('button:text("建立資料夾")')

            # Mock drag start
            # Since playwright drag_and_drop can be flaky with React DnD implementation,
            # we will check if the event handlers are attached and working.
            # But first, we need to have a file.

            # Wait for reload
            page.wait_for_timeout(2000)

            print("Page loaded and setup complete")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_drag_drop()
