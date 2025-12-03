'use client';

import { FormEvent, useEffect, useState } from 'react';

export function UploadForm({
  onUploaded,
  currentPath = ''
}: {
  onUploaded?: () => void;
  currentPath?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    setPath(currentPath);
  }, [currentPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatus('上傳中...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      setStatus('上傳失敗，請稍後再試。');
    } else {
      setStatus('完成！');
      setFile(null);
      setPath(currentPath);
      onUploaded?.();
    }
    setLoading(false);
  };

  return (
    <form
      className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur transition hover:border-emerald-300/30"
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">上傳家庭回憶</p>
          <h2 className="mt-1 text-xl font-semibold">新增照片或影片</h2>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">R2 直存</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-200/80">
        支援照片與影片，檔案會直接存到 Cloudflare R2。
      </p>

      <div className="mt-4 space-y-3">
        <input
          className="w-full cursor-pointer rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-50 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:px-4 file:py-2 file:text-emerald-100 file:font-semibold hover:border-emerald-300/40 focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          type="file"
          accept="image/*,video/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-100">目標資料夾（預設根目錄）</label>
          <input
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-slate-50 placeholder:text-slate-400 focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            type="text"
            value={path}
            placeholder="例如：travel/2024"
            onChange={(event) => setPath(event.target.value)}
          />
        </div>
      </div>

      <button
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!file || loading}
      >
        {loading ? '處理中...' : '上傳檔案'}
      </button>
      {status && (
        <p className="mt-3 text-sm font-semibold text-cyan-100">{status}</p>
      )}
    </form>
  );
}
