# Family Album

一個以 Next.js App Router 打造的家庭相簿，專注於直接管理 Cloudflare R2 的媒體。介面提供路徑導覽、圖片與影片預覽、上傳與管理工具，並以管理密碼保護寫入操作。

## 特色

- **雙層目錄與命名規範**：資料夾深度上限為 2 層、名稱最長 30 字，避免路徑過深或過長。
- **管理密碼與節流**：寫入相關 API 需在 `x-admin-token` header 帶入 `ADMIN_ACCESS_TOKEN`（最長 15 字）。密碼錯誤會依 IP 進行速率限制（預設 5 次 / 5 分鐘），可接上 `ADMIN_RATE_LIMIT_KV` 讓多節點共用計數。
- **媒體瀏覽體驗**：麵包屑導覽、資料夾格線、分頁（每頁 12 筆）、快速搜尋（檔案數超過 36 筆時啟用）以及圖片 / 影片篩選器。
- **上傳與檔案管理**：支援多檔案上傳、拖放移動、重新命名與刪除；前端自動處理圖片壓縮並套用時間戳記檔名以降低衝突。
- **Session 安全性**：管理模式僅儲存在當前分頁的 sessionStorage，15 分鐘未操作會自動失效，換頁或重新整理都需再輸入密碼。
- **Cloudflare Pages 友善**：所有 API 以 Edge Runtime 實作並透過 `aws4fetch` 呼叫 R2，可直接部署到 Pages；若提供 `CLOUDFLARE_API_TOKEN` 則可查詢 bucket 使用量。

## 需求與相依

- Node.js 20+ 與 npm
- Next.js 16、React 19、TypeScript、Tailwind CSS 4
- Cloudflare R2（含 Access Key / Secret Key）、可選的 Cloudflare API Token（用於 bucket 使用量查詢）

## 開發環境設定

1. 安裝套件：
   ```bash
   npm install
   ```
2. 複製並填寫環境變數：
   ```bash
   cp .env.example .env.local
   ```
   依下表填入必要值，若要前端同步顯示大小限制，可同時設定公開變數。
3. 本機啟動：
   ```bash
   npm run dev
   ```
4. 其他腳本：
   - `npm run lint`：以 ESLint 檢查程式碼。
   - `npm run build`：產生生產環境建置成果。
   - `npm run test`：執行 Vitest 測試。

## 環境變數

| 變數 | 必填 | 說明 |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare 帳戶 ID，用於 R2 API。|
| `R2_ACCESS_KEY_ID` | ✅ | R2 Access Key。|
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 Secret Key。|
| `R2_BUCKET_NAME` | ✅ | 儲存媒體的 bucket 名稱。|
| `R2_PUBLIC_BASE` | ✅ | 公開讀取的基底 URL，例如 `https://<bucket>.<account>.r2.cloudflarestorage.com`。|
| `ADMIN_ACCESS_TOKEN` | ✅ | 管理密碼（最長 15 字），所有寫入 API 需於 `x-admin-token` header 帶入。|
| `ADMIN_RATE_LIMIT_MAX_FAILURES` | ⬜️ | 自訂密碼錯誤可嘗試的次數（預設 5 次 / 5 分鐘）。|
| `ADMIN_RATE_LIMIT_KV` | ⬜️ | Cloudflare KV Namespace 綁定名稱，用於跨節點共享速率限制計數。未提供時使用記憶體快取。|
| `CLOUDFLARE_API_TOKEN` | ⬜️ | 具備 R2 讀取權限的 API Token；若設定，`/api/usage` 會直接查詢官方用量 API。|
| `MAX_IMAGE_SIZE_MB` / `NEXT_PUBLIC_MAX_IMAGE_SIZE_MB` | ⬜️ | 圖片單檔大小上限（預設 10MB）。公開版本可顯示在前端提示。|
| `MAX_VIDEO_SIZE_MB` / `MAX_SINGLE_SIZE_MB` / `NEXT_PUBLIC_MAX_VIDEO_SIZE_MB` / `NEXT_PUBLIC_MAX_SINGLE_SIZE_MB` | ⬜️ | 影片單檔大小上限（預設 150MB），多個變數皆可覆寫。|

## 主要功能與限制

- **媒體清單**：依 prefix 直接列出 R2 內容，並以麵包屑呈現路徑。支援每頁 12 筆分頁、圖片 / 影片篩選與快速搜尋（大量檔案時啟用）。
- **資料夾管理**：
  - 建立、重新命名、移動與刪除皆需管理密碼。
  - 資料夾最深 2 層，名稱最長 30 字；移動時也會驗證層級限制。
- **檔案操作**：
  - 重新命名、移動（含拖放）與刪除均需管理密碼並遵守兩層路徑規則。
  - 上傳支援多檔案、總大小上限 400MB、單次最多 20 檔；依檔案 MIME 判定圖片 / 影片上限（預設 10MB / 150MB）。
  - 上傳時自動在檔名加上時間戳記，並將 `Content-Type` 一併寫入 R2。
- **安全與速率限制**：
  - 管理模式狀態僅存在當前分頁的 sessionStorage，15 分鐘未操作會自動登出且離開分頁時會清空。
  - 密碼錯誤會以 IP 為 key 進行限流，達上限後 API 會回傳需等待的分鐘數。
- **bucket 用量**：若提供 `CLOUDFLARE_API_TOKEN`，`/api/usage` 會直接呼叫 Cloudflare 用量 API；否則改用分頁列舉計算總容量。

## API 速查

| 方法 | 路徑 | 用途 | 認證 |
| --- | --- | --- | --- |
| `GET /api/media?prefix=` | 取得指定 prefix 的資料夾與媒體清單。 | 不需密碼。 |
| `POST /api/media` | 建立資料夾（`action: "create-folder"`、`prefix`、`name`）。 | `x-admin-token`。 |
| `PATCH /api/media` | 重新命名或移動（`action: "rename"` 或 `"move"`，並附上 `key` 與目標參數）。 | `x-admin-token`。 |
| `DELETE /api/media` | 刪除檔案或資料夾（`action: "delete"`、`key`）。 | `x-admin-token`。 |
| `POST /api/upload` | 以上傳表單 (`files[]`, `path`) 將圖片 / 影片寫入 R2，套用大小與數量限制。 | `x-admin-token`。 |
| `GET /api/usage` | 查詢 bucket 使用量；優先使用 Cloudflare API，其次以列舉計算。 | `x-admin-token`，並建議提供 `CLOUDFLARE_API_TOKEN`。 |

## 部署建議（Cloudflare Pages）

1. 在 Pages 專案設定中新增上述環境變數，並確保 `R2_*` 金鑰與 `ADMIN_ACCESS_TOKEN` 已填寫。
2. 若要共享密碼速率限制，於 Pages 綁定 `ADMIN_RATE_LIMIT_KV` 到對應的 KV Namespace。
3. `next.config.mjs` 已使用 Edge Runtime 配置 API，部署時不需額外調整；若使用自訂網域，請確認 `R2_PUBLIC_BASE` 與實際公開位址一致。
4. 佈署完成後，可透過 UI 或以下端點驗證：
   - `GET /api/media` 應回傳空清單或既有媒體。
   - 上傳時確保管理密碼正確且符合大小限制；若錯誤，會在回應中看到剩餘嘗試次數或等待時間。

## 疑難排解

- **密碼總是被拒絕**：確認 `ADMIN_ACCESS_TOKEN` 是否與請求 header 的 `x-admin-token` 完全一致，並檢查是否因連續失敗觸發限流。
- **上傳被檔案大小限制阻擋**：可調整 `MAX_IMAGE_SIZE_MB`、`MAX_VIDEO_SIZE_MB`（或對應公開變數）後重新部署。
- **無法取得 bucket 用量**：確定已提供具備 R2 權限的 `CLOUDFLARE_API_TOKEN`，或等待以列舉方式計算（時間較長）。

