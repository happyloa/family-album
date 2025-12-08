'use client';

import { Suspense } from 'react';

import { MediaGrid } from '@/components/MediaGrid';

export default function Home() {
  const refreshToken = 0;

  return (
    <section className="space-y-6" aria-label="家庭相簿首頁">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-800/80 bg-slate-900/60 px-6 py-5 shadow-lg ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">家庭相簿</p>
          <h1 className="mt-1 text-2xl font-bold text-white">管理與瀏覽 Cloudflare R2 的媒體檔案</h1>
        </div>
        <p className="text-sm text-slate-300">請在需要寫入時輸入管理密碼，所有媒體皆依資料夾路徑顯示。</p>
      </div>

      <Suspense fallback={<div className="text-sm text-slate-300">Loading media...</div>}>
        <MediaGrid refreshToken={refreshToken} />
      </Suspense>
    </section>
  );
}
