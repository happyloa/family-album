'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { UploadForm } from './UploadForm';

type MediaFile = {
  key: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
  lastModified?: string;
};

type FolderItem = {
  key: string;
  name: string;
};

type MediaResponse = {
  prefix: string;
  folders: FolderItem[];
  files: MediaFile[];
};

export function MediaGrid({ refreshToken = 0 }: { refreshToken?: number }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [message, setMessage] = useState('');

  const breadcrumb = currentPrefix
    ? currentPrefix.split('/').filter(Boolean).map((part, index, arr) => ({
        label: part,
        key: arr.slice(0, index + 1).join('/')
      }))
    : [];

  const loadMedia = async (prefix = currentPrefix) => {
    setLoading(true);
    const response = await fetch(`/api/media?prefix=${encodeURIComponent(prefix)}`);
    if (!response.ok) {
      setMessage('無法載入媒體，請稍後再試。');
      setLoading(false);
      return;
    }

    const data: MediaResponse = await response.json();
    setFiles(data.files);
    setFolders(data.folders);
    setCurrentPrefix(data.prefix);
    setMessage('');
    setLoading(false);
  };

  useEffect(() => {
    void loadMedia(currentPrefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, currentPrefix]);

  const handleEnterFolder = (folderKey: string) => {
    setCurrentPrefix(folderKey);
  };

  const handleBack = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.join('/'));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setMessage('請輸入資料夾名稱');
      return;
    }

    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-folder', name: newFolderName, prefix: currentPrefix })
    });

    if (!response.ok) {
      setMessage('建立資料夾失敗');
      return;
    }

    setNewFolderName('');
    setMessage('');
    await loadMedia(currentPrefix);
  };

  const hasItems = files.length > 0 || folders.length > 0;

  const promptRename = async (key: string, isFolder: boolean) => {
    const currentName = key.split('/').pop() ?? key;
    const newName = window.prompt('輸入新名稱', currentName)?.trim();
    if (!newName || newName === currentName) return;

    const response = await fetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', key, newName, isFolder })
    });

    if (!response.ok) {
      setMessage('重新命名失敗，請稍後再試');
      return;
    }

    setMessage('');
    await loadMedia(currentPrefix);
  };

  const cardBase = 'rounded-2xl border border-white/10 bg-slate-900/70 shadow-glow backdrop-blur';
  const pillClass = 'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold';
  const subtleButton =
    'inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white disabled:opacity-60';
  const primaryButton =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <section className="px-6 pb-16">
      <div className={`mx-auto flex max-w-6xl flex-col gap-4 ${cardBase} p-6`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className={`${pillClass} border border-emerald-300/30 bg-emerald-500/10 text-emerald-100`}>家庭相簿 · R2 即時同步</div>
              <h2 className="text-2xl font-semibold">資料夾與媒體管理</h2>
              <p className="text-sm text-slate-200/80">
                重新命名、切換資料夾或上傳，所有操作都直接作用在 Cloudflare R2 貯體中。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={subtleButton} onClick={handleBack} disabled={!currentPrefix}>
                ← 返回上一層
              </button>
              <button className={primaryButton} onClick={() => loadMedia(currentPrefix)} disabled={loading}>
                {loading ? '載入中...' : '重新整理列表'}
              </button>
            </div>
          </div>

          <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3`}>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-200/75">目前路徑</span>
            <div className="flex flex-wrap items-center gap-2">
              <button className={`${pillClass} border border-white/10 bg-white/5 text-slate-100`} onClick={() => setCurrentPrefix('')}>
                根目錄
              </button>
              {breadcrumb.map((crumb) => (
                <button
                  key={crumb.key}
                  className={`${pillClass} border border-white/10 bg-white/5 text-slate-100`}
                  onClick={() => setCurrentPrefix(crumb.key)}
                >
                  {crumb.label}
                </button>
              ))}
            </div>
            <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100">
              📁 {folders.length} 個資料夾 · 🖼️ {files.length} 個媒體檔案
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${cardBase} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">建立資料夾</p>
                  <h3 className="text-lg font-semibold">整理新的分類</h3>
                </div>
                <span className={`${pillClass} border border-emerald-300/30 bg-emerald-500/10 text-emerald-100`}>立即生效</span>
              </div>
              <p className="mt-2 text-sm text-slate-200/80">
                會在 R2 中建立虛擬資料夾，方便按照旅行、年份或活動分類。
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-slate-50 placeholder:text-slate-400 focus:border-emerald-300/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  type="text"
                  value={newFolderName}
                  placeholder="輸入資料夾名稱（例如：taiwan-trip）"
                  onChange={(event) => setNewFolderName(event.target.value)}
                />
                <button className={primaryButton} type="button" onClick={handleCreateFolder}>
                  建立
                </button>
              </div>
            </div>

            <UploadForm currentPath={currentPrefix} onUploaded={() => loadMedia(currentPrefix)} />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-4">
        {message && <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{message}</p>}
        {loading && <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">正在載入媒體...</p>}
        {!loading && !hasItems && (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-slate-100">
            目前還沒有任何媒體，先上傳一張照片或影片吧！
          </p>
        )}

        {folders.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">資料夾</h3>
              <p className="text-sm text-slate-200/75">點擊可直接進入，名稱會同步更新到 R2。</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => (
                <article key={folder.key} className={`${cardBase} p-4 transition hover:border-emerald-300/30`}>
                  <div className="flex items-center justify-between">
                    <span className={`${pillClass} border border-white/10 bg-white/5 text-slate-100`}>Folder</span>
                    <button className="text-sm font-semibold text-indigo-200 hover:text-indigo-100" type="button" onClick={() => promptRename(folder.key, true)}>
                      重新命名
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="text-3xl">📂</div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold">{folder.name || '未命名'}</h4>
                      <p className="text-sm text-slate-200/70">{folder.key || '根目錄'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button className={subtleButton} type="button" onClick={() => handleEnterFolder(folder.key)}>
                      進入資料夾
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">媒體檔案</h3>
              <p className="text-sm text-slate-200/75">照片、影片會直接從 R2 讀取，重新命名後即可馬上生效。</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {files.map((item) => (
                <article key={item.key} className={`${cardBase} overflow-hidden p-0`}> 
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {item.type === 'image' ? (
                      <Image src={item.url} alt={item.key} fill sizes="(max-width: 768px) 100vw, 33vw" priority className="h-full w-full object-cover" />
                    ) : (
                      <video src={item.url} controls className="h-full w-full object-cover" preload="metadata" />
                    )}
                  </div>
                  <footer className="space-y-3 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900/90 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`${pillClass} border border-white/15 bg-white/5 text-slate-100`}>
                          {item.type === 'image' ? 'Image' : 'Video'}
                        </span>
                        <span className="text-sm font-semibold text-white">{item.key.split('/').pop()}</span>
                      </div>
                      {item.size && <small className="text-sm text-slate-200/70">{(item.size / 1024 / 1024).toFixed(1)} MB</small>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {item.lastModified && <small className="text-sm text-slate-200/70">{new Date(item.lastModified).toLocaleString()}</small>}
                      <button className={subtleButton} type="button" onClick={() => promptRename(item.key, false)}>
                        重新命名
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
