'use client';

import { Suspense } from 'react';

import { MediaGrid } from '@/components/MediaGrid';

/**
 * Home Page: 專案首頁
 * 包含標題區塊與主要的媒體網格 (MediaGrid)
 */
export default function Home() {
  const refreshToken = 0; // 用於觸發 MediaGrid 重新整理的 key

  return (
    <section className="space-y-8" aria-label="家庭相簿首頁">
      {/* 主標題區塊 - 更精緻的視覺設計 */}
      <header className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-stone-900/90 via-stone-900/80 to-stone-800/70 p-8 shadow-2xl ring-1 ring-white/5 sm:p-10">
        {/* 背景裝飾 */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl" aria-hidden />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/90">
                家庭相簿
              </p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              我們這一家
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-stone-300">
              管理與瀏覽 Cloudflare R2 的媒體檔案。請在需要寫入時輸入管理密碼，所有媒體皆依資料夾路徑顯示。
            </p>
          </div>

          {/* 裝飾性統計卡片 */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-stone-700/50 bg-stone-800/50 px-5 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium text-stone-400">即時同步</p>
              <p className="text-lg font-bold text-amber-400">R2 Storage</p>
            </div>
          </div>
        </div>
      </header>

      {/* 媒體列表區塊：使用 Suspense 處理載入狀態 */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" />
              <p className="text-sm font-medium text-stone-400">載入媒體中...</p>
            </div>
          </div>
        }
      >
        <MediaGrid refreshToken={refreshToken} />
      </Suspense>
    </section>
  );
}
