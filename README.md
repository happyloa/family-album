# Family Album

用 Next.js 打造的家庭相簿，媒體檔案存放在 Cloudflare R2。這個專案預設使用 App Router，並提供上傳與瀏覽 API 範例。

## 開發指引

1. 安裝套件：
   ```bash
   npm install
   ```
2. 設定環境變數，複製 `.env.example` 為 `.env.local`，並填入 Cloudflare R2 的資訊。
3. 本機啟動：
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
   - 若透過 Pages Build，確保在「Environment Variables」與「Project settings → Build system → R2 bindings」一致。
4. **CORS 與檔案型態**：
   - 如果要在瀏覽器直接存取媒體，請在 R2 bucket CORS 規則加入允許 `GET, HEAD, OPTIONS`，並允許 `Content-Type` 標頭。
   - 上傳 API 會限制為圖片與影片格式，並在瀏覽器端自動進行壓縮以節省流量。
5. **部署**：
   - Pages 部署完成後，可透過 `/api/upload` 上傳到指定路徑，並用 `/api/media` 取得媒體列表。

## 重要說明

- 專案未內建資料庫，媒體資料直接列舉 R2 bucket。
- 若要限制權限，可在 API route 中加入驗證機制或簽發一次性下載 URL。
- 預設僅提供瀏覽功能，若要啟用建立、上傳、移動與刪除，請在網址後加入 `?isAdmin` 參數，並依需求加上額外驗證邏輯。
