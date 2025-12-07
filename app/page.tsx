'use client';

import { Suspense } from 'react';

import { MediaGrid } from '@/components/MediaGrid';

export default function Home() {
  const refreshToken = 0;

  return (
    <section className="space-y-8" aria-label="家庭相簿首頁">
      <header className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-2xl ring-1 ring-white/10 sm:p-10">
        <div className="absolute inset-0 bg-mesh opacity-80" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(37,99,235,0.24),transparent_40%),radial-gradient(circle_at_90%_40%,rgba(16,185,129,0.24),transparent_45%)] opacity-60" aria-hidden />
        <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 ring-1 ring-emerald-400/30">家庭專屬</span>
              <span className="rounded-full bg-cyan-500/15 px-3 py-1 ring-1 ring-cyan-400/30">Cloudflare R2</span>
              <span className="rounded-full bg-indigo-500/15 px-3 py-1 ring-1 ring-indigo-400/30">Next.js 16</span>
              <span className="rounded-full bg-fuchsia-500/15 px-3 py-1 ring-1 ring-fuchsia-400/30">Edge Ready</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                雲端家庭相簿 · 科技感全面升級
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-200">
                集中保存全家的照片與影片，搭配強化的安全管理密碼、即時同步與防呆提醒，正式公開前的最後驗收版，讓家人隨時隨地都能安心瀏覽。
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="rounded-full bg-white/5 px-4 py-2 font-semibold text-emerald-100 ring-1 ring-emerald-400/40">端到端安全校驗</span>
                <span className="rounded-full bg-white/5 px-4 py-2 font-semibold text-cyan-100 ring-1 ring-cyan-400/40">智慧路徑導覽</span>
                <span className="rounded-full bg-white/5 px-4 py-2 font-semibold text-indigo-100 ring-1 ring-indigo-400/40">全站暗色科技風</span>
              </div>
            </div>
          </div>
          <div className="glass-card neon-border rounded-2xl p-6 text-sm text-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">同步狀態</p>
                <p className="text-xl font-bold text-white">Cloudflare R2 Ready</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                Secure
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-slate-200 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">資料防護</p>
                <p className="text-sm font-semibold text-white">管理密碼驗證、路徑淨化</p>
                <p className="text-xs text-slate-400">避免非法檔名與過深層級，降低風險。</p>
              </div>
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-indigo-300">體驗優化</p>
                <p className="text-sm font-semibold text-white">更清晰的狀態回饋與載入防呆</p>
                <p className="text-xs text-slate-400">新增錯誤提示、頁面聚焦操作引導。</p>
              </div>
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
