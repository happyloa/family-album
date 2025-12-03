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

## 部署到 Cloudflare Pages

- 新增環境變數：`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE`。
- 確保 bucket 設為 public-read，或改用具權限的簽章 URL 方案。
- 架設後可直接透過 `/api/upload` 上傳，`/api/media` 取得媒體列表。

## 重要說明

- 專案未內建資料庫，媒體資料直接列舉 R2 bucket。
- `R2_PUBLIC_BASE` 應該是公開讀取的 URL 前綴，例如 `https://<bucket>.<account>.r2.cloudflarestorage.com`。
- 若要限制權限，可在 API route 中加入驗證機制或簽發一次性下載 URL。
