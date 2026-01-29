'use client';

import { type DragEvent } from 'react';

import { MediaThumbnail } from './MediaThumbnail';
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
  onDelete,
  filterLabel,
  filter,
  filterVisible,
  onFilterChange,
  searchEnabled,
  searchQuery,
  onSearchChange,
  isAdmin,
  itemsPerPage,
  onDragStart,
  onDragEnd
}: {
  allFilesCount: number;
  files: MediaFile[];
  paginatedFiles: MediaFile[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelect: (file: MediaFile, trigger: HTMLElement) => void;
  onRename: (key: string) => void;
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
  onDragStart?: (file: MediaFile, event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-bold text-white">媒體檔案</h3>
          <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-300 ring-1 ring-primary-500/20">
            {filterLabel}（共 {files.length}）
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {searchEnabled ? <label className="flex items-center gap-2 rounded-xl border border-surface-700/50 bg-surface-800/50 px-3 py-2 text-xs font-semibold text-surface-200">
              <span className="text-surface-500">搜尋</span>
              <input
                className="w-40 rounded-lg border border-surface-700 bg-surface-900/80 px-3 py-2 text-xs font-medium text-white shadow-inner outline-none transition-all duration-200 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30"
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="輸入標題關鍵字"
                aria-label="搜尋媒體標題"
              />
            </label> : null}
          {filterVisible ? <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-700/50 bg-surface-800/50 px-3 py-2 text-xs font-semibold text-surface-200">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  className={`rounded-lg border px-3 py-1.5 transition-all duration-200 cursor-pointer ${filter === key
                    ? 'border-primary-500/50 bg-primary-500/15 text-primary-100 shadow-glow'
                    : 'border-surface-700 bg-surface-800 text-surface-100 hover:border-primary-500/40 hover:text-primary-100'
                    }`}
                  type="button"
                  onClick={() => onFilterChange(key)}
                >
                  {label}
                </button>
              ))}
            </div> : null}
        </div>
      </div>
      {files.length === 0 && (
        <div className="rounded-2xl border border-surface-700/50 bg-surface-800/50 px-4 py-3 text-sm text-surface-100">
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
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-surface-700/50 bg-surface-800/50 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-xl"
            onClick={(event) => onSelect(item, event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item, event.currentTarget);
              }
            }}
            draggable={isAdmin}
            onDragStart={(event) => {
              if (!isAdmin) return;
              event.stopPropagation();
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', item.key);
              onDragStart?.(item, event);
            }}
            onDragEnd={() => {
              onDragEnd?.();
            }}
            role="button"
            tabIndex={0}
            aria-label={`${item.key.split('/').pop()} 預覽`}
          >
            <MediaThumbnail media={item} />
            <div className="flex flex-col gap-2 p-4 text-sm text-surface-100">
              <div className="space-y-1">
                <p className="truncate text-sm font-semibold text-white" title={item.key}>
                  {item.key.split('/').pop()}
                </p>
                {item.lastModified ? <p className="text-xs text-surface-500">更新：{formatTimestamp(item.lastModified)}</p> : null}
              </div>
              {isAdmin ? <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-full bg-surface-700/50 px-3 py-1 text-xs font-semibold text-surface-200 transition-all duration-200 hover:bg-surface-700 hover:text-white cursor-pointer"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRename(item.key);
                    }}
                  >
                    重新命名
                  </button>
                  <button
                    className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 transition-all duration-200 hover:bg-red-500/25 hover:text-red-200 cursor-pointer"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(item.key);
                    }}
                  >
                    刪除
                  </button>
                </div> : null}
            </div>
          </article>
        ))}
      </div>
      {files.length > itemsPerPage && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-surface-700/50 bg-surface-800/50 px-4 py-3 text-sm text-surface-100">
          <button
            className="rounded-lg border border-surface-700 px-3 py-1.5 font-semibold transition-all duration-200 hover:border-primary-500/50 hover:text-primary-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← 上一頁
          </button>
          <span className="rounded-lg bg-surface-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-surface-400">
            第 {currentPage} / {totalPages} 頁
          </span>
          <button
            className="rounded-lg border border-surface-700 px-3 py-1.5 font-semibold transition-all duration-200 hover:border-primary-500/50 hover:text-primary-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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

