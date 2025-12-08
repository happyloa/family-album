'use client';

import { useEffect, useMemo, useState } from 'react';

import { UploadForm } from './UploadForm';
import { AdminAccessPanel } from './media/AdminAccessPanel';
import { BreadcrumbNav } from './media/BreadcrumbNav';
import { EmptyState } from './media/EmptyState';
import { FolderCreator } from './media/FolderCreator';
import { FolderGrid } from './media/FolderGrid';
import { MediaPreviewModal } from './media/MediaPreviewModal';
import { MediaSection } from './media/MediaSection';
import { MessageToast } from './media/MessageToast';
import { PathOverview } from './media/PathOverview';
import { FolderItem, MediaFile, MediaResponse, MessageTone } from './media/types';

const MAX_FOLDER_DEPTH = 2;
const MAX_FOLDER_NAME_LENGTH = 30;
const MAX_ADMIN_TOKEN_LENGTH = 15;
const ITEMS_PER_PAGE = 12;

type FilterOption = 'all' | 'image' | 'video';

type Breadcrumb = { label: string; key: string };

const sanitizeName = (value: string) => value.replace(/[<>:"/\\|?*]+/g, '').trim();
const sanitizePath = (value: string) =>
  value
    .split('/')
    .map((segment) => sanitizeName(segment))
    .filter(Boolean)
    .join('/');

const getDepth = (path: string) => (path ? path.split('/').filter(Boolean).length : 0);

export function MediaGrid({ refreshToken = 0 }: { refreshToken?: number }) {
  const [adminToken, setAdminToken] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const isAdmin = Boolean(adminToken);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const pushMessage = (text: string, tone: MessageTone = 'info') => {
    setMessageTone(tone);
    setMessage(text);
  };

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- 初次載入時嘗試恢復管理密碼狀態即可

  const breadcrumbTrail: Breadcrumb[] = useMemo(() => {
    const parts = currentPrefix.split('/').filter(Boolean);
    const nested = parts.map((part, index, arr) => ({ label: part, key: arr.slice(0, index + 1).join('/') }));
    return [{ label: '根目錄', key: '' }, ...nested];
  }, [currentPrefix]);

  const hasImages = useMemo(() => files.some((file) => file.type === 'image'), [files]);
  const hasVideos = useMemo(() => files.some((file) => file.type === 'video'), [files]);
  const filterVisible = hasImages && hasVideos;
  const searchEnabled = files.length > 36;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (!filterVisible && filter !== 'all') {
      setFilter('all');
    }
  }, [filterVisible, filter]);

  useEffect(() => {
    if (!searchEnabled && searchQuery) {
      setSearchQuery('');
    }
  }, [searchEnabled, searchQuery]);

  const filteredFiles = useMemo(() => {
    const byType = filterVisible && filter !== 'all' ? files.filter((file) => file.type === filter) : files;

    if (!searchEnabled || !normalizedQuery) return byType;

    return byType.filter((file) => {
      const title = file.key.split('/').pop()?.toLowerCase() ?? '';
      return title.includes(normalizedQuery);
    });
  }, [files, filter, filterVisible, searchEnabled, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / ITEMS_PER_PAGE));
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFiles.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredFiles]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, normalizedQuery]);

  const authorizedFetch: typeof fetch = (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (isAdmin && adminToken) {
      headers.set('x-admin-token', adminToken);
    }

    return fetch(input, { ...init, headers });
  };

  const loadMedia = async (prefix = currentPrefix) => {
    setLoading(true);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 10000) : null;

    try {
      const response = await fetch(`/api/media?prefix=${encodeURIComponent(prefix)}`, { signal: controller?.signal });

      if (!response.ok) {
        const content = response.status === 429 ? '請稍後再試，系統暫時忙碌。' : '無法載入媒體，請稍後再試。';
        pushMessage(content, 'error');
        return;
      }

      const data: MediaResponse = await response.json();
      setFiles(data.files);
      setFolders(data.folders);
      setCurrentPrefix(data.prefix);
      setCurrentPage(1);
      setMessage('');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        pushMessage('載入逾時，請再次嘗試或檢查網路。', 'error');
      } else {
        pushMessage('載入媒體時發生錯誤，請稍後再試。', 'error');
      }
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMedia(currentPrefix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, currentPrefix]);

  const handleEnterFolder = (folderKey: string) => {
    if (getDepth(folderKey) > MAX_FOLDER_DEPTH) {
      pushMessage('資料夾層數最多兩層', 'error');
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
        pushMessage('請輸入管理密碼', 'error');
      }
      return false;
    }

    if (trimmed.length > MAX_ADMIN_TOKEN_LENGTH) {
      if (!options?.silent) {
        pushMessage('管理密碼最多 15 個字', 'error');
      }
      setAdminToken('');
      localStorage.removeItem('adminToken');
      return false;
    }

    if (!options?.silent) {
      pushMessage('正在驗證管理密碼…');
    }

    try {
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
          pushMessage('管理密碼不正確，請再試一次', 'error');
        }
        return false;
      }

      setAdminToken(trimmed);
      localStorage.setItem('adminToken', trimmed);
      setAdminInput(trimmed);
      pushMessage(options?.silent ? '' : '已啟用管理模式', 'success');
      return true;
    } catch (error) {
      if (!options?.silent) {
        pushMessage('驗證時出現錯誤，請檢查網路後重試。', 'error');
      }
      return false;
    }
  };

  const handleSaveAdminToken = () => {
    void validateAndApplyToken(adminInput);
  };

  const handleClearAdminToken = () => {
    setAdminInput('');
    setAdminToken('');
    localStorage.removeItem('adminToken');
    pushMessage('已退出管理模式');
  };

  const handleCreateFolder = async () => {
    if (!isAdmin) return;

    const safeName = sanitizeName(newFolderName);

    if (!safeName) {
      pushMessage('請輸入資料夾名稱', 'error');
      return;
    }

    if (safeName.length > MAX_FOLDER_NAME_LENGTH) {
      pushMessage('資料夾名稱最多 30 個字', 'error');
      return;
    }

    const nextDepth = getDepth(currentPrefix) + 1;
    if (nextDepth > MAX_FOLDER_DEPTH) {
      pushMessage('資料夾層數最多兩層，無法在此建立新資料夾', 'error');
      return;
    }

    try {
      const response = await authorizedFetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-folder', name: safeName, prefix: currentPrefix })
      });

      if (!response.ok) {
        pushMessage('建立資料夾失敗', 'error');
        return;
      }

      setNewFolderName('');
      pushMessage('已建立新資料夾', 'success');
      await loadMedia(currentPrefix);
    } catch (error) {
      pushMessage('建立資料夾時發生錯誤，請稍後再試。', 'error');
    }
  };

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
      pushMessage('資料夾名稱最多 30 個字', 'error');
      return;
    }

    try {
      const response = await authorizedFetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', key, newName, isFolder })
      });

      if (!response.ok) {
        pushMessage('重新命名失敗，請稍後再試', 'error');
        return;
      }

      pushMessage('已更新名稱', 'success');
      await loadMedia(currentPrefix);
    } catch (error) {
      pushMessage('重新命名時發生錯誤，請稍後再試。', 'error');
    }
  };

  const handleMove = async (key: string, isFolder: boolean) => {
    if (!isAdmin) return;

    const rawInput = window.prompt('輸入目標路徑（例如：albums/2024）', currentPrefix);
    if (rawInput === null) return;

    const targetPrefix = sanitizePath(rawInput.trim());

    if (getDepth(targetPrefix) > MAX_FOLDER_DEPTH) {
      pushMessage('資料夾層數最多兩層，請選擇較淺的目標路徑', 'error');
      return;
    }

    if (isFolder && getDepth(targetPrefix) + 1 > MAX_FOLDER_DEPTH) {
      pushMessage('移動後會超過資料夾層數上限（2 層）', 'error');
      return;
    }

    try {
      const response = await authorizedFetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', key, targetPrefix, isFolder })
      });

      if (!response.ok) {
        pushMessage('移動失敗，請稍後再試', 'error');
        return;
      }

      pushMessage('已移動完成', 'success');
      await loadMedia(targetPrefix || currentPrefix);
    } catch (error) {
      pushMessage('移動時發生錯誤，請稍後再試。', 'error');
    }
  };

  const handleDelete = async (key: string, isFolder: boolean) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(`確定要刪除${isFolder ? '資料夾與其內容' : '檔案'}嗎？`);
    if (!confirmed) return;

    try {
      const response = await authorizedFetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', key, isFolder })
      });

      if (!response.ok) {
        pushMessage('刪除失敗，請稍後再試', 'error');
        return;
      }

      pushMessage('已刪除', 'success');
      await loadMedia(currentPrefix);
    } catch (error) {
      pushMessage('刪除時發生錯誤，請稍後再試。', 'error');
    }
  };

  const hasItems = files.length > 0 || folders.length > 0;
  const filterLabel = filterVisible ? (filter === 'all' ? '全部' : filter === 'image' ? '僅圖片' : '僅影片') : '全部';

  return (
    <section className="relative space-y-5">
      <MessageToast message={message} tone={messageTone} />

      <div className="glass-card rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl ring-1 ring-white/10 sm:p-8">
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
          <PathOverview currentPrefix={currentPrefix} folderCount={folders.length} fileCount={files.length} />
          <AdminAccessPanel
            isAdmin={isAdmin}
            adminInput={adminInput}
            maxLength={MAX_ADMIN_TOKEN_LENGTH}
            onValidate={handleSaveAdminToken}
            onClear={handleClearAdminToken}
            onInputChange={setAdminInput}
          />
        </div>

        {isAdmin && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <FolderCreator value={newFolderName} onChange={(value) => setNewFolderName(sanitizeName(value))} onSubmit={handleCreateFolder} />
            <UploadForm adminToken={adminToken} currentPath={currentPrefix} onUploaded={() => loadMedia(currentPrefix)} />
          </div>
        )}
      </div>

      <BreadcrumbNav
        breadcrumbTrail={breadcrumbTrail}
        currentPrefix={currentPrefix}
        maxDepth={MAX_FOLDER_DEPTH}
        foldersCount={folders.length}
        filesCount={files.length}
        onBack={handleBack}
        onRefresh={() => loadMedia(currentPrefix)}
        onNavigate={setCurrentPrefix}
        loading={loading}
        depth={Math.min(getDepth(currentPrefix), MAX_FOLDER_DEPTH)}
      />

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">正在載入媒體…</div>
      )}

      {!loading && !hasItems && <EmptyState />}

      <FolderGrid
        folders={folders}
        isAdmin={isAdmin}
        onEnter={handleEnterFolder}
        onRename={(key) => promptRename(key, true)}
        onMove={(key) => handleMove(key, true)}
        onDelete={(key) => handleDelete(key, true)}
      />

      <MediaSection
        allFilesCount={files.length}
        files={filteredFiles}
        paginatedFiles={paginatedFiles}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onSelect={setSelectedMedia}
        onRename={(key) => promptRename(key, false)}
        onMove={(key) => handleMove(key, false)}
        onDelete={(key) => handleDelete(key, false)}
        filterLabel={filterLabel}
        filter={filter}
        filterVisible={filterVisible}
        onFilterChange={(value) => setFilter(value)}
        searchEnabled={searchEnabled}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAdmin={isAdmin}
        itemsPerPage={ITEMS_PER_PAGE}
      />

      <MediaPreviewModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
    </section>
  );
}
