'use client';

import { useState } from 'react';
import { MediaGrid } from '@/components/MediaGrid';
import { UploadForm } from '@/components/UploadForm';

export default function Home() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <>
      <section className="px-6 pb-6 pt-12 md:pt-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="grid gap-10 lg:grid-cols-[1.6fr,1fr] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200 shadow-glow">
                家庭專屬 · Cloudflare R2 + Next.js
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                  打造我們的家庭相簿
                </h1>
                <p className="max-w-3xl text-lg text-slate-200/80">
                  將每一次出遊的照片與影片存到 R2，透過 Next.js 的 gallery 介面快速預覽。這裡是安全又方便的共同回憶基地。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-emerald-100 shadow-inner shadow-emerald-500/20">
                  ✅ 使用 Next.js Image 最佳化圖片
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-cyan-100 shadow-inner shadow-cyan-400/20">
                  ☁️ Cloudflare R2 雲端儲存
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-indigo-100 shadow-inner shadow-indigo-400/20">
                  👪 家人專用的瀏覽介面
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-glow backdrop-blur">
              <h2 className="text-xl font-semibold">部署與環境變數</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-200/80">
                填入 Cloudflare R2 的金鑰後即可上傳。部署到 Cloudflare Pages 時，請在專案設定新增以下環境變數：
              </p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-200/85">
                <li>R2_ACCOUNT_ID</li>
                <li>R2_ACCESS_KEY_ID</li>
                <li>R2_SECRET_ACCESS_KEY</li>
                <li>R2_BUCKET_NAME</li>
                <li>R2_PUBLIC_BASE（公開讀取的 URL 前綴）</li>
              </ul>
              <p className="mt-4 text-sm text-slate-200/80">
                若 bucket 設為 public-read，就能直接透過 R2 的公開網址顯示圖片。
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <UploadForm onUploaded={() => setRefreshToken((value) => value + 1)} />
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-glow backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">快速分享</p>
                  <h3 className="mt-1 text-xl font-semibold">同步到所有家庭成員</h3>
                </div>
                <span className="rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-100">
                  即時
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-200/80">
                任何新增、重新命名或刪除的檔案，會直接更新到 Cloudflare R2，家人打開頁面就能看到最新的內容。
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200/75">
                <span className="rounded-full bg-white/5 px-3 py-2">🖼️ 圖片與影片即時預覽</span>
                <span className="rounded-full bg-white/5 px-3 py-2">📁 資料夾路徑一目了然</span>
                <span className="rounded-full bg-white/5 px-3 py-2">🔒 只有家人可以操作</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MediaGrid refreshToken={refreshToken} />
    </>
  );
}
