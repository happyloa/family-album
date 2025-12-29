from playwright.sync_api import sync_playwright
import json

def verify_drag_drop():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock API responses
        def handle_media_route(route):
            url = route.request.url
            if "POST" in route.request.method: # Validate
                route.fulfill(status=200, body=json.dumps({"ok": True}))
                return

            # GET list
            route.fulfill(status=200, body=json.dumps({
                "prefix": "",
                "folders": [{"key": "folder1", "name": "folder1"}],
                "files": [{"key": "image.png", "url": "http://example.com/image.png", "type": "image"}]
            }))

        page.route("**/api/media*", handle_media_route)

        try:
            page.goto("http://localhost:3000")

            # Setup admin
            page.fill('input[placeholder="輸入管理密碼以進行上傳與修改"]', "12345")
            page.click('button:text("驗證管理密碼")')
            page.wait_for_selector('button:text("驗證管理密碼")', state="hidden") # Wait for panel to update (or message)

            # Wait for grid
            page.wait_for_selector('article[aria-label="image.png 預覽"]')

            # Trigger dragstart on the image
            page.evaluate("""
                const item = document.querySelector('article[aria-label="image.png 預覽"]');
                const dataTransfer = new DataTransfer();
                const event = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer });
                item.dispatchEvent(event);
            """)

            # Check if "放到上一層" appears? No, we are at root, so parentPrefix is null.
            # But FolderGrid items should react.
            # FolderGrid checks `canDropMedia` (which is `isAdmin && isDraggingMedia`).
            # If `isDraggingMedia` is true, FolderGrid items should have `aria-label` starting with "將媒體移動到".

            page.wait_for_timeout(500) # Wait for state update

            folder = page.locator('article', has_text="folder1")
            label = folder.get_attribute("aria-label")
            print(f"Folder aria-label: {label}")

            if "將媒體移動到" not in (label or ""):
                print("FAILURE: Drag state did not update UI.")
            else:
                print("SUCCESS: Drag state updated UI.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_drag_drop()
