'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
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
  const [adminToken, setAdminToken] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const isAdmin = Boolean(adminToken);

  const MAX_FOLDER_DEPTH = 2;
  const MAX_FOLDER_NAME_LENGTH = 30;

  const sanitizeName = (value: string) => value.replace(/[<>:"/\\|?*]+/g, '').trim();
  const sanitizePath = (value: string) =>
    value
      .split('/')
      .map((segment) => sanitizeName(segment))
      .filter(Boolean)
      .join('/');

  const getDepth = (path: string) => (path ? path.split('/').filter(Boolean).length : 0);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const MAX_ADMIN_TOKEN_LENGTH = 15;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : '';
    if (saved) {
      void validateAndApplyToken(saved, { silent: true });
    }
  }, []);

  const breadcrumbTrail = useMemo(() => {
    const parts = currentPrefix.split('/').filter(Boolean);
    const nested = parts.map((part, index, arr) => ({
      label: part,
      key: arr.slice(0, index + 1).join('/')
    }));

    return [{ label: '根目錄', key: '' }, ...nested];
  }, [currentPrefix]);

  const filteredFiles = useMemo(
    () => (filter === 'all' ? files : files.filter((file) => file.type === filter)),
    [files, filter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage));
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFiles.slice(start, start + itemsPerPage);
  }, [currentPage, filteredFiles, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const authorizedFetch: typeof fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (isAdmin && adminToken) {
      headers.set('x-admin-token', adminToken);
    }

    return fetch(input, { ...init, headers });
  };

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
    setCurrentPage(1);
    setMessage('');
    setLoading(false);
  };

  useEffect(() => {
    void loadMedia(currentPrefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, currentPrefix]);

  const handleEnterFolder = (folderKey: string) => {
    if (getDepth(folderKey) > MAX_FOLDER_DEPTH) {
      setMessage('資料夾層數最多兩層');
      return;
    }

    setMessage('');
    setCurrentPrefix(folderKey);
  };

  const handleBack = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.join('/'));
  };

  const validateAndApplyToken = async (token: string, options?: { silent?: boolean }) => {
    const trimmed = token.trim();
    if (!trimmed) {
      setAdminToken('');
      if (!options?.silent) {
        setMessage('請輸入管理密碼');
      }
      return false;
    }

    if (trimmed.length > MAX_ADMIN_TOKEN_LENGTH) {
      if (!options?.silent) {
        setMessage('管理密碼最多 15 個字');
      }
      setAdminToken('');
      localStorage.removeItem('adminToken');
      return false;
    }

    if (!options?.silent) {
      setMessage('正在驗證管理密碼…');
    }

    const response = await fetch('/api/media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': trimmed
      },
      body: JSON.stringify({ action: 'validate' })
    });

    if (!response.ok) {
      localStorage.removeItem('adminToken');
      setAdminInput('');
      if (!options?.silent) {
        setMessage('管理密碼不正確，請再試一次');
      }
      return false;
    }

    setAdminToken(trimmed);
    localStorage.setItem('adminToken', trimmed);
    setAdminInput(trimmed);
    setMessage(options?.silent ? '' : '已啟用管理模式');
    return true;
  };

  const handleSaveAdminToken = () => {
    void validateAndApplyToken(adminInput);
  };

  const handleClearAdminToken = () => {
    setAdminInput('');
    setAdminToken('');
    localStorage.removeItem('adminToken');
    setMessage('已退出管理模式');
  };

  const handleCreateFolder = async () => {
    if (!isAdmin) return;

    const safeName = sanitizeName(newFolderName);

    if (!safeName) {
      setMessage('請輸入資料夾名稱');
      return;
    }

    if (safeName.length > MAX_FOLDER_NAME_LENGTH) {
      setMessage('資料夾名稱最多 30 個字');
      return;
    }

    const nextDepth = getDepth(currentPrefix) + 1;
    if (nextDepth > MAX_FOLDER_DEPTH) {
      setMessage('資料夾層數最多兩層，無法在此建立新資料夾');
      return;
    }

    const response = await authorizedFetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-folder', name: safeName, prefix: currentPrefix })
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
    if (!isAdmin) return;

    const currentName = key.split('/').pop() ?? key;
    const extensionIndex = isFolder ? -1 : currentName.lastIndexOf('.');
    const extension = extensionIndex > -1 ? currentName.slice(extensionIndex) : '';
    const baseName = extension ? currentName.slice(0, extensionIndex) : currentName;

    const inputName = window.prompt('輸入新名稱', baseName);
    const sanitizedInput = sanitizeName(inputName?.trim() || '');
    const newName = extension ? `${sanitizedInput}${extension}` : sanitizedInput;

    if (!sanitizedInput || sanitizedInput === baseName) return;

    if (isFolder && newName.length > MAX_FOLDER_NAME_LENGTH) {
      setMessage('資料夾名稱最多 30 個字');
      return;
    }

    const response = await authorizedFetch('/api/media', {
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

  const handleMove = async (key: string, isFolder: boolean) => {
    if (!isAdmin) return;

    const rawInput = window.prompt('輸入目標路徑（例如：albums/2024）', currentPrefix);
    if (rawInput === null) return;

    const targetPrefix = sanitizePath(rawInput.trim());

    if (getDepth(targetPrefix) > MAX_FOLDER_DEPTH) {
      setMessage('資料夾層數最多兩層，請選擇較淺的目標路徑');
      return;
    }

    if (isFolder && getDepth(targetPrefix) + 1 > MAX_FOLDER_DEPTH) {
      setMessage('移動後會超過資料夾層數上限（2 層）');
      return;
    }

    const response = await authorizedFetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', key, targetPrefix, isFolder })
    });

    if (!response.ok) {
      setMessage('移動失敗，請稍後再試');
      return;
    }

    setMessage('');
    await loadMedia(targetPrefix || currentPrefix);
  };

  const handleDelete = async (key: string, isFolder: boolean) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(`確定要刪除${isFolder ? '資料夾與其內容' : '檔案'}嗎？`);
    if (!confirmed) return;

    const response = await authorizedFetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', key, isFolder })
    });

    if (!response.ok) {
      setMessage('刪除失敗，請稍後再試');
      return;
    }

    setMessage('');
    await loadMedia(currentPrefix);
  };

  return (
    <section className="relative space-y-5">
      {message && (
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-3 sm:right-6 sm:top-6">
          <div className="pointer-events-auto w-72 rounded-2xl border border-amber-500/40 bg-slate-950/90 px-4 py-3 text-sm font-semibold text-amber-50 shadow-lg shadow-amber-500/20">
            {message}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl ring-1 ring-white/5 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-300">家庭相簿 · R2 即時同步</p>
            <h2 className="text-2xl font-bold text-white">媒體控制台</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              快速檢視路徑、啟用安全管理密碼，並在需要時開啟管理模式處理上傳與編輯。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">目前路徑</p>
                <p className="text-xl font-bold text-white">{currentPrefix || '根目錄'}</p>
                <p className="text-xs text-slate-400">僅顯示兩層資料夾。善用下方導覽與篩選控制快速跳轉。</p>
              </div>
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20">
                {folders.length} 資料夾 · {files.length} 媒體
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">安全管理</p>
                <h3 className="text-lg font-semibold text-white">輸入管理密碼啟用編輯權限</h3>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  isAdmin
                    ? 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/40'
                    : 'bg-slate-800 text-slate-200 ring-slate-600'
                }`}
              >
                {isAdmin ? '管理模式開啟' : '唯讀模式'}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {isAdmin ? (
                <div className="flex justify-end">
                  <button
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-rose-400 hover:text-rose-100"
                    type="button"
                    onClick={handleClearAdminToken}
                  >
                    退出管理模式
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <input
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    type="password"
                    maxLength={MAX_ADMIN_TOKEN_LENGTH}
                    value={adminInput}
                    placeholder="輸入管理密碼以進行上傳與修改"
                    onChange={(event) => setAdminInput(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-cyan-300 hover:to-emerald-300"
                      type="button"
                      onClick={handleSaveAdminToken}
                    >
                      驗證管理密碼
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">建立資料夾</p>
                  <h3 className="text-lg font-semibold text-white">整理新的分類</h3>
                  <p className="text-sm text-slate-400">會在 R2 中建立虛擬資料夾，方便依照旅行、年份或活動分類。</p>
                  <p className="text-xs text-slate-500">資料夾層級最多兩層，名稱最多 30 個字。</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  type="text"
                  value={newFolderName}
                  placeholder="輸入資料夾名稱（例如：taiwan-trip）"
                  onChange={(event) => setNewFolderName(sanitizeName(event.target.value))}
                />
                <button
                  className="inline-flex h-full min-h-[52px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                  onClick={handleCreateFolder}
                >
                  建立
                </button>
              </div>
            </div>

            <UploadForm adminToken={adminToken} currentPath={currentPrefix} onUploaded={() => loadMedia(currentPrefix)} />
          </div>
        )}
      </div>

      <nav
        aria-label="路徑導覽"
        className="rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-sm text-slate-100 shadow-2xl ring-1 ring-white/5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-xl">
              🧭
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <span className="rounded-full bg-slate-800 px-3 py-1">路徑導覽</span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200 ring-1 ring-emerald-500/30">
                  {folders.length} 資料夾 · {files.length} 媒體
                </span>
              </div>
              <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold" aria-label="Breadcrumb">
                {breadcrumbTrail.map((crumb, index) => {
                  const isLast = index === breadcrumbTrail.length - 1;
                  return (
                    <li key={crumb.key} className="flex items-center gap-2">
                      <button
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition ${
                          isLast
                            ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-50 shadow-glow'
                            : 'border-slate-700 bg-slate-900/60 text-slate-100 hover:border-emerald-300 hover:text-emerald-100'
                        }`}
                        onClick={() => setCurrentPrefix(crumb.key)}
                        type="button"
                        disabled={isLast && currentPrefix === crumb.key}
                      >
                        {index === 0 ? '🏠' : '📁'}
                        <span className="max-w-[140px] truncate text-left">{crumb.label || '根目錄'}</span>
                      </button>
                      {index < breadcrumbTrail.length - 1 && <span aria-hidden className="text-slate-500">/</span>}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleBack}
              disabled={!currentPrefix}
              type="button"
            >
              ← 返回上一層
            </button>
            <button
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => loadMedia(currentPrefix)}
              disabled={loading}
              type="button"
            >
              {loading ? '載入中…' : '重新整理列表'}
            </button>
          </div>
        </div>
      </nav>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">正在載入媒體…</div>
      )}
      {!loading && !hasItems && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-8 text-center text-slate-200 shadow-2xl ring-1 ring-white/5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" aria-hidden />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-emerald-400/50 bg-slate-900/80 text-4xl">
              ☁️
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">這個資料夾是空的</h3>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              拖曳媒體到上方上傳區，或建立資料夾來整理檔案。支援圖片與影片。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => loadMedia(currentPrefix)}
              disabled={loading}
              type="button"
            >
              重新整理
            </button>
            {currentPrefix && (
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
                onClick={handleBack}
                type="button"
              >
                回到上一層
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">提示：管理模式開啟後即可直接上傳或建立子資料夾。</p>
        </div>
      )}

      {folders.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-white">資料夾</h3>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                點擊可直接進入
              </span>
            </div>
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
                    <h4 className="text-lg font-semibold text-white">{folder.name || '未命名'}</h4>
                    <p className="text-xs text-slate-400">{folder.key || '根目錄'}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <button
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        promptRename(folder.key, true);
                      }}
                    >
                      重新命名
                    </button>
                    <button
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMove(folder.key, true);
                      }}
                    >
                      移動
                    </button>
                    <button
                      className="rounded-full bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-600/40"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(folder.key, true);
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
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-white">媒體檔案</h3>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                目前篩選：{filter === 'all' ? '全部' : filter === 'image' ? '僅圖片' : '僅影片'}（共 {filteredFiles.length}）
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'all', label: '全部' },
                  { key: 'image', label: '圖片' },
                  { key: 'video', label: '影片' }
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    filter === key
                      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100 shadow-glow'
                      : 'border-slate-700 text-slate-100 hover:border-emerald-300 hover:text-emerald-100'
                  }`}
                  onClick={() => setFilter(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {filteredFiles.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
              目前篩選條件下沒有媒體，請切換篩選或重新整理。
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedFiles.map((item) => (
              <article key={item.key} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg">
                <div
                  className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMedia(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMedia(item);
                    }
                  }}
                >
                  <div className="relative aspect-[4/3] w-full cursor-zoom-in transition duration-200 group-hover:brightness-110">
                    {item.type === 'image' ? (
                      <Image
                        src={item.url}
                        alt={item.key}
                        fill
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <video
                        className="h-full w-full rounded-xl object-cover"
                        src={item.url}
                        preload="metadata"
                        playsInline
                        muted
                        controlsList="nodownload"
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
                    {isAdmin && (
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-slate-700 hover:text-emerald-100"
                          type="button"
                          onClick={() => promptRename(item.key, false)}
                        >
                          重新命名
                        </button>
                        <button
                          className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                          type="button"
                          onClick={() => handleMove(item.key, false)}
                        >
                          移動
                        </button>
                        <button
                          className="rounded-full bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-600/40"
                          type="button"
                          onClick={() => handleDelete(item.key, false)}
                        >
                          刪除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredFiles.length > itemsPerPage && (
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
              <button
                className="rounded-lg border border-slate-700 px-3 py-1.5 font-semibold transition hover:border-emerald-400 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                下一頁 →
              </button>
            </div>
          )}
        </div>
      )}

      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
          onClick={() => setSelectedMedia(null)}
          role="presentation"
        >
          <div
            className="relative max-h-[90vh] w-[min(1100px,92vw)] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/95 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{selectedMedia.key.split('/').pop()}</p>
                {selectedMedia.size && (
                  <p className="text-xs text-slate-400">{(selectedMedia.size / 1024 / 1024).toFixed(2)} MB</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-100 whitespace-nowrap"
                  href={selectedMedia.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  在新分頁開啟
                </a>
                <button
                  className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 whitespace-nowrap"
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                >
                  關閉
                </button>
              </div>
            </div>
            <div className="relative flex items-center justify-center bg-slate-950/60 p-4 sm:p-6">
              <div className="relative aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-black">
                {selectedMedia.type === 'image' ? (
                  <Image
                    src={selectedMedia.url}
                    alt={selectedMedia.key}
                    fill
                    loading="lazy"
                    decoding="async"
                    className="object-contain"
                    sizes="100vw"
                  />
                ) : (
                  <video
                    className="h-full w-full bg-black object-contain"
                    src={selectedMedia.url}
                    controls
                    autoPlay
                    preload="metadata"
                    playsInline
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
