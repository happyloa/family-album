import { MediaGrid } from '@/components/MediaGrid';
import { UploadForm } from '@/components/UploadForm';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="badge" style={{ marginBottom: '0.5rem' }}>
            家庭專屬 · Cloudflare R2 + Next.js
          </p>
          <h1>打造我們的家庭相簿</h1>
          <p>
            將每一次出遊的照片與影片存到 R2，透過 Next.js 的 gallery 介面快速預覽。
            這裡是安全又方便的共同回憶基地。
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <div className="badge">✅ 使用 Next.js Image 最佳化圖片</div>
            <div className="badge">☁️ Cloudflare R2 雲端儲存</div>
            <div className="badge">👪 家人專用的瀏覽介面</div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <UploadForm />
          <div className="card">
            <h2 style={{ marginTop: 0 }}>部署與環境變數</h2>
            <p style={{ marginTop: 0, color: 'rgba(229, 231, 235, 0.8)' }}>
              填入 Cloudflare R2 的金鑰後即可上傳。部署到 Cloudflare Pages 時，請在
              專案設定新增以下環境變數：
            </p>
            <ul style={{ lineHeight: 1.6, paddingLeft: '1.25rem', color: 'rgba(229, 231, 235, 0.85)' }}>
              <li>R2_ACCOUNT_ID</li>
              <li>R2_ACCESS_KEY_ID</li>
              <li>R2_SECRET_ACCESS_KEY</li>
              <li>R2_BUCKET_NAME</li>
              <li>R2_PUBLIC_BASE（公開讀取的 URL 前綴）</li>
            </ul>
            <p style={{ marginBottom: 0, color: 'rgba(229, 231, 235, 0.8)' }}>
              若 bucket 設為 public-read，就能直接透過 R2 的公開網址顯示圖片。
            </p>
          </div>
        </div>
      </section>

      <MediaGrid />
    </>
  );
}
