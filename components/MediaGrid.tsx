'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type MediaItem = {
  key: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
  lastModified?: string;
};

export function MediaGrid() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMedia = async () => {
    setLoading(true);
    const response = await fetch('/api/media');
    if (response.ok) {
      const data = await response.json();
      setMedia(data.media);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadMedia();
  }, []);

  return (
    <section className="section">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <p className="badge" style={{ margin: 0 }}>家庭相簿</p>
            <h2 style={{ margin: '0.5rem 0 0' }}>所有圖片 & 影片</h2>
          </div>
          <button className="btn" onClick={loadMedia} disabled={loading}>
            {loading ? '載入中...' : '重新整理'}
          </button>
        </div>
      </div>
      {loading && <p style={{ textAlign: 'center', opacity: 0.8 }}>正在載入媒體...</p>}
      {!loading && media.length === 0 && (
        <p style={{ textAlign: 'center', opacity: 0.8 }}>目前還沒有任何媒體，先上傳一張照片或影片吧！</p>
      )}
      <div className="grid gallery-grid">
        {media.map((item) => (
          <article key={item.key} className="media-card">
            {item.type === 'image' ? (
              <Image src={item.url} alt={item.key} fill sizes="(max-width: 768px) 100vw, 33vw" priority />
            ) : (
              <video src={item.url} controls style={{ width: '100%', height: '100%' }} preload="metadata" />
            )}
            <footer>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.key.split('/').pop()}</span>
                {item.size && <small style={{ opacity: 0.8 }}>{(item.size / 1024 / 1024).toFixed(1)} MB</small>}
              </div>
              {item.lastModified && <small style={{ opacity: 0.75 }}>{new Date(item.lastModified).toLocaleString()}</small>}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
