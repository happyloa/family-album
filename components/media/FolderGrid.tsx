'use client';

import { type DragEvent } from 'react';

import { FolderItem } from './types';

export function FolderGrid({
  folders,
  isAdmin,
  onEnter,
  onRename,
  onDelete,
  canDropMedia,
  onDropMedia
}: {
  folders: FolderItem[];
  isAdmin: boolean;
  onEnter: (key: string) => void;
  onRename: (key: string) => void;
  onDelete: (key: string) => void;
  canDropMedia?: boolean;
  onDropMedia?: (folderKey: string) => void;
}) {
  if (!folders.length) return null;

  const handleDrop = (event: DragEvent<HTMLElement>, folderKey: string) => {
    if (!canDropMedia) return;
    event.preventDefault();
    event.stopPropagation();
    onDropMedia?.(folderKey);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white">資料夾</h3>
          <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-300 ring-1 ring-primary-500/20">
            點擊可直接進入
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <article
            key={folder.key}
            className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-surface-700/50 bg-surface-800/50 p-4 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-primary-500/40 hover:bg-surface-800/80 hover:shadow-xl focus-within:-translate-y-1 focus-within:border-primary-500/40"
            role="button"
            tabIndex={0}
            onClick={() => onEnter(folder.key)}
            onDragOver={(event) => {
              if (!canDropMedia) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => handleDrop(event, folder.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onEnter(folder.key);
              }
            }}
            aria-label={canDropMedia ? `將媒體移動到 ${folder.name} 資料夾` : undefined}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 text-2xl ring-1 ring-primary-500/20">
                📂
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="truncate text-lg font-semibold text-white">{folder.name || '未命名'}</h4>
                <p className="truncate text-xs text-surface-500">{folder.key || '根目錄'}</p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-surface-300">
                <button
                  className="rounded-full bg-surface-700/50 px-3 py-1 text-xs font-semibold text-surface-200 transition-all duration-200 hover:bg-surface-700 hover:text-white cursor-pointer"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRename(folder.key);
                  }}
                >
                  重新命名
                </button>
                <button
                  className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 transition-all duration-200 hover:bg-red-500/25 hover:text-red-200 cursor-pointer"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(folder.key);
                  }}
                >
                  刪除
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
