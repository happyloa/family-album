# Family Album

用 Next.js 打造的家庭相簿，媒體檔案存放在 Cloudflare R2，並以雙層資料夾結構（資料夾名稱最多 30 個字）管理。專案使用 App Router，內建瀏覽 API 與上傳範例，透過管理密碼啟用建立、重新命名、移動與刪除。

## 功能摘要

- 直接列出 Cloudflare R2 的媒體，顯示路徑導覽與檔案計數。
- 管理作業（建立、重新命名、移動、刪除）須提供管理密碼並遵守最多兩層的資料夾限制。
- 上傳支援圖片與影片，並在瀏覽器端自動嘗試壓縮以節省流量，上傳完成會刷新清單。
- 管理模式僅保留於當前分頁的瀏覽器工作階段：閒置 15 分鐘或關閉分頁會自動登出，並且每次進行管理操作前都會要求再次輸入密碼以縮短密碼暴露時間。
- 管理密碼錯誤會觸發每 IP 限流（預設 5 次 / 5 分鐘），並在介面提示剩餘嘗試次數或鎖定等待時間。
- 支援媒體篩選器，可快速切換僅看圖片、僅看影片或全部媒體。

## 開發指引

1. 確認環境：建議使用 Node.js 20 以上版本，並確保已安裝 npm。
2. 安裝套件：
   ```bash
   npm install
   ```
3. 設定環境變數：
   ```bash
   cp .env.example .env.local
   ```
   依照下一節的說明填入 Cloudflare R2 與管理密碼相關設定。
4. 本機啟動：
   ```bash
   npm run dev
   ```

## Cloudflare R2 設定與部署到 Pages

介面名稱與路徑可能因 Cloudflare 更新而異，若找不到本文提到的選項，可用頁面搜尋或在 R2 服務中尋找關鍵字：「bucket」「Public access」「CORS」「API token」「Access key」。

1. **建立 Bucket 與權限（可公開或私有）**：
   - 在 R2 新增 bucket 並記下名稱；如需公開讀取，找到 Public access 或權限設定啟用公開，並將 `R2_PUBLIC_BASE` 設為公開 URL（格式類似 `https://<bucket>.<account>.r2.cloudflarestorage.com`）。
   - 若要私有存取，跳過公開讀取，改用簽名網址或在 API 層驗證，並保留 `R2_PUBLIC_BASE` 供應用組出讀取路徑。
2. **建立 API Token / Access Keys**：
   - 在 R2 或帳戶的「API Tokens / Access Keys」頁面新增一組金鑰，取得 `R2_ACCESS_KEY_ID` 與 `R2_SECRET_ACCESS_KEY`；`R2_ACCOUNT_ID` 通常會在同一頁或帳戶首頁顯示。
   - 若介面改版，先搜尋「Manage R2 API tokens」「Access keys」等關鍵字，多半位於 Security、API 或 R2 設定分頁。
3. **設定環境變數**：
   - 將以下變數填入 `.env.local`（開發）或 Pages 環境設定：
     - `R2_ACCOUNT_ID`
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`
    - `R2_BUCKET_NAME`
    - `R2_PUBLIC_BASE`
    - `ADMIN_ACCESS_TOKEN`（長度最多 15 個字，寫入 API 皆須帶上 `x-admin-token` 標頭；不要儲存在公開書籤或共用裝置，以降低洩漏風險）
    - `ADMIN_RATE_LIMIT_MAX_FAILURES`（可選，管理密碼允許的失敗次數；未設定則使用 5 次 / 5 分鐘的預設限制）
   - 若透過 Pages Build，確保在「Environment Variables」與「Project settings → Build system → R2 bindings」一致。
4. **CORS 與檔案型態**：
   - 如果要在瀏覽器直接存取媒體，請在 R2 bucket CORS 規則加入允許 `GET, HEAD, OPTIONS`，並允許 `Content-Type` 標頭。
   - 上傳 API 會限制為圖片與影片格式，並在瀏覽器端自動進行壓縮以節省流量。
5. **部署與驗證**：
   - Pages 部署完成後，可透過 `/api/upload` 上傳到指定路徑，並用 `/api/media` 取得媒體列表；若遇到按鈕位置或權限名稱改動，可比對上述關鍵字重新定位設定。

## 重要說明

- 專案未內建資料庫，媒體資料直接列舉 R2 bucket。
- 已加入管理密碼檢查，若要更嚴格的身分驗證，可改用 OAuth/NextAuth 或簽發一次性下載 URL。
- 預設僅提供瀏覽功能，若要啟用建立、上傳、移動與刪除，請在介面輸入 `ADMIN_ACCESS_TOKEN` 對應的管理密碼即可。
- 資料夾結構限制為兩層，資料夾名稱最長 30 字，相關驗證已內建於前端操作。
- 管理密碼欄位限制為 15 個字，輸入更長會被拒絕，請在設定環境變數時一併遵守此長度。
- 管理密碼錯誤會觸發每 IP 限流；可綁定 Cloudflare KV（`ADMIN_RATE_LIMIT_KV`）以跨節點共享計數，未綁定則使用記憶體暫存。
