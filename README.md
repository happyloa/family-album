# Family Album

用 Next.js 打造的家庭相簿，媒體檔案存放在 Cloudflare R2，並以雙層資料夾結構（資料夾名稱最多 30 個字）管理。專案使用 App Router，內建瀏覽 API 與上傳範例，透過管理密碼啟用建立、重新命名、移動與刪除。

## 功能摘要

- 直接列出 Cloudflare R2 的媒體，顯示路徑導覽與檔案計數。
- 管理作業（建立、重新命名、移動、刪除）須提供管理密碼並遵守最多兩層的資料夾限制。
- 上傳支援圖片與影片，並在瀏覽器端自動嘗試壓縮以節省流量，上傳完成會刷新清單。
- 管理模式僅保留於當前分頁的瀏覽器工作階段：閒置 15 分鐘或關閉分頁會自動登出，並且每次進行管理操作前都會要求再次輸入密碼以縮短密碼暴露時間。
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

1. **建立 Bucket 與權限**：
   - 在 R2 建立新的 bucket，記下 bucket 名稱。
   - 前往 **Settings → Public access** 勾選公開讀取，並將 `R2_PUBLIC_BASE` 設成該公開 URL（格式類似 `https://<bucket>.<account>.r2.cloudflarestorage.com`）。
   - 若要限制公開權限，則改成預先建立 Cloudflare Signed URL 流程，並更新 API route 以驗證請求。
2. **建立 API Token**：
   - 在 Cloudflare 的 **R2 → Manage R2 API tokens** 新增 Access Key，取得 `R2_ACCESS_KEY_ID` 與 `R2_SECRET_ACCESS_KEY`。
   - `R2_ACCOUNT_ID` 可在 Cloudflare 帳戶首頁找到。
3. **設定環境變數**：
   - 將以下變數填入 `.env.local`（開發）或 Pages 環境設定：
     - `R2_ACCOUNT_ID`
     - `R2_ACCESS_KEY_ID`
     - `R2_SECRET_ACCESS_KEY`
     - `R2_BUCKET_NAME`
     - `R2_PUBLIC_BASE`
     - `ADMIN_ACCESS_TOKEN`（長度最多 15 個字，寫入 API 皆須帶上 `x-admin-token` 標頭）
   - 若透過 Pages Build，確保在「Environment Variables」與「Project settings → Build system → R2 bindings」一致。
4. **CORS 與檔案型態**：
   - 如果要在瀏覽器直接存取媒體，請在 R2 bucket CORS 規則加入允許 `GET, HEAD, OPTIONS`，並允許 `Content-Type` 標頭。
   - 上傳 API 會限制為圖片與影片格式，並在瀏覽器端自動進行壓縮以節省流量。
5. **部署**：
   - Pages 部署完成後，可透過 `/api/upload` 上傳到指定路徑，並用 `/api/media` 取得媒體列表。

## 重要說明

- 專案未內建資料庫，媒體資料直接列舉 R2 bucket。
- 已加入管理密碼檢查，若要更嚴格的身分驗證，可改用 OAuth/NextAuth 或簽發一次性下載 URL。
- 預設僅提供瀏覽功能，若要啟用建立、上傳、移動與刪除，請在介面輸入 `ADMIN_ACCESS_TOKEN` 對應的管理密碼即可。
- 資料夾結構限制為兩層，資料夾名稱最長 30 字，相關驗證已內建於前端操作。
- 管理密碼欄位限制為 15 個字，輸入更長會被拒絕，請在設定環境變數時一併遵守此長度。
