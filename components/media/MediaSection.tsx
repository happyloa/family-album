'use client';

import Image from 'next/image';
import { MediaFile } from './types';

export function MediaSection({
  allFilesCount,
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
  filter,
  filterVisible,
  onFilterChange,
  searchEnabled,
  searchQuery,
  onSearchChange,
  isAdmin,
  itemsPerPage
}: {
  allFilesCount: number;
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
  filter: 'all' | 'image' | 'video';
  filterVisible: boolean;
  onFilterChange: (value: 'all' | 'image' | 'video') => void;
  searchEnabled: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isAdmin: boolean;
  itemsPerPage: number;
}) {
  if (!allFilesCount) return null;

  const filters: { key: 'all' | 'image' | 'video'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'image', label: '圖片' },
    { key: 'video', label: '影片' }
  ];

  const formatTimestamp = (value: string) => {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      const hours = String(parsed.getHours()).padStart(2, '0');
      const minutes = String(parsed.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    return value.replace('T', ' ').replace(/Z$/, '');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-white">媒體檔案</h3>
          <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">{filterLabel}（共 {files.length}）</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {searchEnabled && (
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200">
              <span className="text-slate-400">搜尋</span>
              <input
                className="w-40 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-medium text-white shadow-inner outline-none ring-emerald-500/50 focus:border-emerald-400 focus:ring"
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="輸入標題關鍵字"
                aria-label="搜尋媒體標題"
              />
            </label>
          )}
          {filterVisible && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  className={`rounded-lg border px-3 py-1.5 transition ${
                    filter === key
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-50 shadow-glow'
                      : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-emerald-300 hover:text-emerald-100'
                  }`}
                  type="button"
                  onClick={() => onFilterChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {files.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
          {searchQuery.trim()
            ? `沒有找到包含「${searchQuery.trim()}」的媒體，請換個關鍵字或清除搜尋。`
            : filterVisible && filter !== 'all'
              ? '這個分類目前沒有媒體，請切換其他類型或回到全部。'
              : '目前沒有符合條件的媒體。'}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedFiles.map((item) => (
          <article
            key={item.key}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition hover:-translate-y-1 hover:border-cyan-400/50"
            onClick={() => onSelect(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${item.key.split('/').pop()} 預覽`}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
              {item.type === 'image' ? (
                <Image src={item.url} alt={item.key} fill className="object-cover" sizes="(min-width: 1280px) 25vw, 50vw" />
              ) : (
                <video className="h-full w-full object-cover" src={item.url} preload="metadata" muted playsInline />
              )}
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-end text-xs font-semibold text-white">
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
                {item.lastModified && (
                  <p className="text-xs text-slate-400">更新：{formatTimestamp(item.lastModified)}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRename(item.key);
                    }}
                  >
                    重新命名
                  </button>
                  <button
                    className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(item.key);
                    }}
                  >
                    移動
                  </button>
                  <button
                    className="rounded-full bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-600/40"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(item.key);
                    }}
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
