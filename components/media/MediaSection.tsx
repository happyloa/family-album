'use client';

import Image from 'next/image';
import { MediaFile } from './types';

export function MediaSection({
  files,
  paginatedFiles,
  currentPage,
  totalPages,
  onPageChange,
  onSelect,
  onRename,
  onMove,
  onDelete,
  filterLabel,
  isAdmin,
  itemsPerPage
}: {
  files: MediaFile[];
  paginatedFiles: MediaFile[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelect: (file: MediaFile) => void;
  onRename: (key: string) => void;
  onMove: (key: string) => void;
  onDelete: (key: string) => void;
  filterLabel: string;
  isAdmin: boolean;
  itemsPerPage: number;
}) {
  if (!files.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-white">媒體檔案</h3>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">{filterLabel}（共 {files.length}）</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedFiles.map((item) => (
          <article
            key={item.key}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition hover:-translate-y-1 hover:border-cyan-400/50"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
              {item.type === 'image' ? (
                <Image src={item.url} alt={item.key} fill className="object-cover" sizes="(min-width: 1280px) 25vw, 50vw" />
              ) : (
                <video className="h-full w-full object-cover" src={item.url} preload="metadata" muted playsInline />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                <button
                  className="rounded-lg bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-400/40"
                  type="button"
                  onClick={() => onSelect(item)}
                >
                  預覽
                </button>
                <span className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-100 ring-1 ring-slate-700">
                  {item.type === 'image' ? '圖片' : '影片'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-4 text-sm text-slate-100">
              <div className="space-y-1">
                <p className="truncate text-sm font-semibold text-white" title={item.key}>
                  {item.key.split('/').pop()}
                </p>
                {item.lastModified && <p className="text-xs text-slate-400">更新：{item.lastModified}</p>}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    type="button"
                    onClick={() => onRename(item.key)}
                  >
                    重新命名
                  </button>
                  <button
                    className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    type="button"
                    onClick={() => onMove(item.key)}
                  >
                    移動
                  </button>
                  <button
                    className="rounded-full bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-600/40"
                    type="button"
                    onClick={() => onDelete(item.key)}
                  >
                    刪除
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {files.length > itemsPerPage && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
          <button
            className="rounded-lg border border-slate-700 px-3 py-1.5 font-semibold transition hover:border-emerald-400 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← 上一頁
          </button>
          <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            第 {currentPage} / {totalPages} 頁
          </span>
          <button
            className="rounded-lg border border-slate-700 px-3 py-1.5 font-semibold transition hover:border-emerald-400 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            下一頁 →
          </button>
        </div>
      )}
    </div>
  );
}
