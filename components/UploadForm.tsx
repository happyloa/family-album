'use client';

import { FormEvent, useState } from 'react';

export function UploadForm({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatus('上傳中...');

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      setStatus('上傳失敗，請稍後再試。');
    } else {
      setStatus('完成！');
      setFile(null);
      onUploaded?.();
    }
    setLoading(false);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 style={{ marginTop: 0 }}>上傳家庭回憶</h2>
      <p style={{ marginTop: 0, color: 'rgba(229, 231, 235, 0.8)' }}>
        支援照片與影片，檔案會直接存到 Cloudflare R2。
      </p>
      <input
        className="input"
        type="file"
        accept="image/*,video/*"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button className="btn" type="submit" disabled={!file || loading}>
        {loading ? '處理中...' : '上傳檔案'}
      </button>
      {status && (
        <p style={{ margin: '0.75rem 0 0', color: '#a5f3fc', fontWeight: 500 }}>{status}</p>
      )}
    </form>
  );
}
