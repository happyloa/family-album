'use client';

import { Suspense } from 'react';

import { MediaGrid } from '@/components/MediaGrid';

export default function Home() {
  const refreshToken = 0;

  return (
    <section className="space-y-8" aria-label="家庭相簿首頁">
      <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl ring-1 ring-white/5 sm:p-10">
        <div className="absolute inset-0 bg-mesh opacity-70" aria-hidden />
        <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 ring-1 ring-emerald-400/30">家庭專屬</span>
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 ring-1 ring-cyan-400/30">Cloudflare R2</span>
              <span className="rounded-full bg-indigo-500/15 px-3 py-1 ring-1 ring-indigo-400/30">Next.js 16</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                家庭雲端相簿中心
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-200">
                這裡集中保存全家的照片與影片，直接同步到 Cloudflare R2，方便備份、整理與分享。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {["快速切換資料夾", "拖放式上傳（支援影片）", "即時重新命名"].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-2xl bg-slate-800/70 px-4 py-3 text-sm font-medium text-slate-100 ring-1 ring-white/5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-slate-900/70 p-6 text-sm text-slate-200 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">同步狀態</p>
                <p className="text-xl font-bold text-white">Cloudflare R2 Ready</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                Secure
              </span>
            </div>
            <div className="mt-4 space-y-2 text-slate-300">
              <p>・建立資料夾、上傳、重新命名一站完成</p>
              <p>・路徑導覽與統計卡，快速掌握目前位置</p>
              <p>・R2 公開網址直接顯示於圖片、影片</p>
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="text-sm text-slate-300">Loading media...</div>}>
        <MediaGrid refreshToken={refreshToken} />
      </Suspense>
    </section>
  );
}
