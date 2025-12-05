'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export function MediaGrid({ refreshToken = 0, initialPrefix = '' }: { refreshToken?: number; initialPrefix?: string }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrefix, setCurrentPrefix] = useState(initialPrefix);
  const [newFolderName, setNewFolderName] = useState('');
  const [message, setMessage] = useState('');
  const [lightboxItem, setLightboxItem] = useState<MediaFile | null>(null);

  const router = useRouter();

  useEffect(() => {
    setCurrentPrefix(initialPrefix);
  }, [initialPrefix]);

  const breadcrumb = useMemo(
    () =>
      currentPrefix
        ? currentPrefix.split('/').filter(Boolean).map((part, index, arr) => ({
            label: part,
            key: arr.slice(0, index + 1).join('/')
          }))
        : [],
    [currentPrefix]
  );

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
    setMessage('');
    setLoading(false);
  };

  useEffect(() => {
    void loadMedia(currentPrefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, currentPrefix]);

  const navigateToPrefix = (prefix: string) => {
    const normalizedPrefix = prefix.trim();
    setCurrentPrefix(normalizedPrefix);
    const targetPath = normalizedPrefix ? `/${normalizedPrefix}` : '/';
    router.push(targetPath, { scroll: false });
  };

  useEffect(() => {
    if (!lightboxItem) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxItem(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxItem]);

  const handleEnterFolder = (folderKey: string) => {
    navigateToPrefix(folderKey);
  };

  const handleBack = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    navigateToPrefix(parts.join('/'));
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

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl ring-1 ring-white/5 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-300">家庭相簿 · R2 即時同步</p>
            <h2 className="text-2xl font-bold text-white">資料夾與媒體管理</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              重新命名、切換資料夾或上傳都直接作用在 Cloudflare R2，新的設計讓操作更直覺。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">目前路徑</p>
            <p className="mt-2 text-lg font-bold text-white">{currentPrefix || '根目錄'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">資料夾</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-300">{folders.length}</p>
            <p className="text-xs text-slate-400">點擊卡片即可進入</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">媒體檔案</p>
            <p className="mt-2 text-2xl font-extrabold text-cyan-300">{files.length}</p>
            <p className="text-xs text-slate-400">圖片與影片皆可直接預覽</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">建立資料夾</p>
                <h3 className="text-lg font-semibold text-white">整理新的分類</h3>
                <p className="text-sm text-slate-400">會在 R2 中建立虛擬資料夾，方便依照旅行、年份或活動分類。</p>
              </div>
              <span className="self-start rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                立即生效
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                type="text"
                value={newFolderName}
                placeholder="輸入資料夾名稱（例如：taiwan-trip）"
                onChange={(event) => setNewFolderName(event.target.value)}
              />
              <button
                className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                onClick={handleCreateFolder}
              >
                建立
              </button>
            </div>
          </div>

          <UploadForm currentPath={currentPrefix} onUploaded={() => loadMedia(currentPrefix)} />
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
          {message}
        </div>
      )}
      {loading && !message && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">正在載入媒體…</div>
      )}
      {!loading && !hasItems && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 text-center text-sm text-slate-200">
          目前還沒有任何媒體，先上傳一張照片或影片吧！
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 shadow-lg">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">目前路徑</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            onClick={() => navigateToPrefix('')}
          >
            根目錄
          </button>
          {breadcrumb.map((crumb) => (
            <button
              key={crumb.key}
              className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              onClick={() => navigateToPrefix(crumb.key)}
            >
              {crumb.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            📁 {folders.length} 個資料夾 · 🖼️ {files.length} 個媒體檔案
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleBack}
              disabled={!currentPrefix}
              type="button"
            >
              ← 返回上一層
            </button>
            <button
              className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => loadMedia(currentPrefix)}
              disabled={loading}
              type="button"
            >
              {loading ? '載入中…' : '重新整理列表'}
            </button>
          </div>
        </div>
      </div>

      {folders.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-white">資料夾</h3>
            <p className="text-sm text-slate-400">點擊可直接進入，名稱會同步更新到 R2。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <article
                key={folder.key}
                className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg transition hover:-translate-y-1 hover:border-emerald-400/50 focus-within:-translate-y-1 focus-within:border-emerald-400/50"
                role="button"
                tabIndex={0}
                onClick={() => handleEnterFolder(folder.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleEnterFolder(folder.key);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">📂</div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Folder</p>
                    <h4 className="text-lg font-semibold text-white">{folder.name || '未命名'}</h4>
                    <p className="text-xs text-slate-400">{folder.key || '根目錄'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    路徑可立即使用
                  </span>
                  <button
                    className="text-sm font-semibold text-emerald-200 transition hover:text-emerald-100"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      promptRename(folder.key, true);
                    }}
                  >
                    重新命名
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-white">媒體檔案</h3>
            <p className="text-sm text-slate-400">照片、影片會直接從 R2 讀取，重新命名後即可馬上生效。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((item) => (
              <article key={item.key} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg">
                <div
                  className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-emerald-500/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => setLightboxItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setLightboxItem(item);
                    }
                  }}
                >
                  <div className="absolute left-0 top-0 z-10 m-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    點擊放大預覽
                  </div>
                  <div className="relative aspect-[4/3] w-full">
                    {item.type === 'image' ? (
                      <Image
                        src={item.url}
                        alt={item.key}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <video
                        className="h-full w-full rounded-xl object-cover"
                        src={item.url}
                        preload="metadata"
                        muted
                        playsInline
                        loop
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1 px-1 pb-2">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                      {item.type === 'image' ? 'Image' : 'Video'}
                    </span>
                    {item.size && <span className="text-xs text-slate-400">{(item.size / 1024 / 1024).toFixed(1)} MB</span>}
                  </div>
                  <div className="text-base font-semibold text-white">{item.key.split('/').pop()}</div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{item.lastModified ? new Date(item.lastModified).toLocaleString() : ''}</span>
                    <button
                      className="text-sm font-semibold text-emerald-200 transition hover:text-emerald-100"
                      type="button"
                      onClick={() => promptRename(item.key, false)}
                    >
                      重新命名
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {lightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur">
          <div className="relative w-[min(1100px,100%)] space-y-3">
            <button
              className="absolute right-0 top-0 z-20 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/20"
              type="button"
              onClick={() => setLightboxItem(null)}
            >
              ✕ 關閉
            </button>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
              <div className="relative h-[60vh] w-full bg-black">
                {lightboxItem.type === 'image' ? (
                  <Image
                    src={lightboxItem.url}
                    alt={lightboxItem.key}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                ) : (
                  <video
                    className="h-full w-full bg-black object-contain"
                    src={lightboxItem.url}
                    controls
                    autoPlay
                    playsInline
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-200">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">{lightboxItem.key.split('/').pop()}</p>
                  <p className="text-xs text-slate-400">{lightboxItem.key}</p>
                </div>
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-400/40 transition hover:bg-emerald-500/25"
                  href={lightboxItem.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  在新分頁開啟
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
