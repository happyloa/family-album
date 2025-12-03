'use client';

import { useState } from 'react';
import { MediaGrid } from '@/components/MediaGrid';
import { UploadForm } from '@/components/UploadForm';

export default function Home() {
  const [refreshToken, setRefreshToken] = useState(0);

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
        <UploadForm onUploaded={() => setRefreshToken((value) => value + 1)} />
      </section>

      <MediaGrid refreshToken={refreshToken} />
    </>
  );
}
