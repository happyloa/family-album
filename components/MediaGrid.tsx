'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { UploadForm } from './UploadForm';
import { AdminAccessPanel } from './media/AdminAccessPanel';
import { AdminActionModal, AdminActionTarget, AdminActionType } from './media/AdminActionModal';
import { BreadcrumbNav } from './media/BreadcrumbNav';
import {
  ADMIN_SESSION_DURATION_MS,
  ADMIN_TOKEN_STORAGE_KEY,
  ITEMS_PER_PAGE,
  MAX_ADMIN_TOKEN_LENGTH,
  MAX_FOLDER_DEPTH,
  MAX_FOLDER_NAME_LENGTH
} from './media/constants';
import { EmptyState } from './media/EmptyState';
import { FolderCreator } from './media/FolderCreator';
import { FolderGrid } from './media/FolderGrid';
import { MediaPreviewModal } from './media/MediaPreviewModal';
import { MediaSection } from './media/MediaSection';
import { MessageToast } from './media/MessageToast';
import { PathOverview } from './media/PathOverview';
import { getDepth, sanitizeName, sanitizePath } from './media/sanitize';
import { FolderItem, MediaFile, MediaResponse, MessageTone } from './media/types';

type FilterOption = 'all' | 'image' | 'video';

type Breadcrumb = { label: string; key: string };

export function MediaGrid({ refreshToken = 0 }: { refreshToken?: number }) {
  const [adminToken, setAdminToken] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const isAdmin = Boolean(adminToken);
  const adminTimeoutRef = useRef<number | null>(null);

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
  const [adminAction, setAdminAction] = useState<{ action: AdminActionType; target: AdminActionTarget } | null>(null);
  const previewTriggerRef = useRef<HTMLElement | null>(null);

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
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) : '';
    if (saved) {
      void validateAndApplyToken(saved, { silent: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- 初次載入時嘗試恢復管理密碼狀態即可

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const depth = Math.min(getDepth(currentPrefix), MAX_FOLDER_DEPTH);

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

    // API 端有驗證密碼，透過共用函式統一附上 headers，避免重複程式碼
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

  const clearAdminSession = (notice?: string) => {
    setAdminInput('');
    setAdminToken('');
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);

    if (adminTimeoutRef.current) {
      window.clearTimeout(adminTimeoutRef.current);
      adminTimeoutRef.current = null;
    }

    if (notice) {
      pushMessage(notice, 'info');
    }
  };

  const resetAdminTimeout = () => {
    if (adminTimeoutRef.current) {
      window.clearTimeout(adminTimeoutRef.current);
    }

    // 重新點擊會刷新計時，避免長時間閒置導致管理者操作到一半被踢出
    adminTimeoutRef.current = window.setTimeout(() => {
      clearAdminSession('管理模式已逾時，請重新輸入。');
    }, ADMIN_SESSION_DURATION_MS);
  };

  const validateAndApplyToken = async (token: string, options?: { silent?: boolean }) => {
    const trimmed = token.trim();
    if (!trimmed) {
      clearAdminSession(options?.silent ? undefined : '請輸入管理密碼');
      return false;
    }

    if (trimmed.length > MAX_ADMIN_TOKEN_LENGTH) {
      if (!options?.silent) {
        pushMessage('管理密碼最多 15 個字', 'error');
      }
      clearAdminSession();
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
        let payload: { remainingAttempts?: number; retryAfterMinutes?: number } | null = null;
        try {
          payload = (await response.json()) as { remainingAttempts?: number; retryAfterMinutes?: number };
        } catch (parseError) {
          payload = null;
        }

        clearAdminSession();
        if (!options?.silent) {
          if (response.status === 429) {
            const minutes = payload?.retryAfterMinutes ?? 5;
            pushMessage(`因密碼輸入不正確，請於 ${minutes} 分鐘後再試`, 'error');
          } else if (response.status === 401 && typeof payload?.remainingAttempts === 'number') {
            pushMessage(`管理密碼不正確，還有 ${payload.remainingAttempts} 次機會`, 'error');
          } else {
            pushMessage('管理密碼不正確，請再試一次', 'error');
          }
        }
        return false;
      }

      setAdminToken(trimmed);
      setAdminInput(trimmed);
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmed);
      resetAdminTimeout();
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
    clearAdminSession('已退出管理模式');
  };

  const requestAdminToken = async (promptMessage = '請輸入管理密碼以繼續'): Promise<boolean> => {
    if (!adminToken) {
      const input = window.prompt(promptMessage, adminInput);
      if (input === null) return false;

      setAdminInput(input);
      const isValid = await validateAndApplyToken(input);
      if (!isValid) return false;
    }

    resetAdminTimeout();
    return true;
  };

  const handleCreateFolder = async () => {
    const allowed = await requestAdminToken('請輸入管理密碼以建立資料夾');
    if (!allowed) return;

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

  const openAdminActionModal = async (action: AdminActionType, key: string, isFolder: boolean) => {
    const promptMap: Record<AdminActionType, string> = {
      rename: '請輸入管理密碼以重新命名',
      move: '請輸入管理密碼以移動項目',
      delete: '請輸入管理密碼以刪除項目'
    };
    const allowed = await requestAdminToken(promptMap[action]);
    if (!allowed) return;

    setAdminAction({ action, target: { key, isFolder } });
  };

  const handleAdminActionConfirm = async (payload: {
    action: AdminActionType;
    key: string;
    isFolder: boolean;
    newName?: string;
    targetPrefix?: string;
  }) => {
    if (payload.action === 'rename') {
      if (!payload.newName) return;
      try {
        const response = await authorizedFetch('/api/media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rename',
            key: payload.key,
            newName: payload.newName,
            isFolder: payload.isFolder
          })
        });

        if (!response.ok) {
          pushMessage('重新命名失敗，請稍後再試', 'error');
          return;
        }

        pushMessage('已更新名稱', 'success');
        setAdminAction(null);
        await loadMedia(currentPrefix);
      } catch (error) {
        pushMessage('重新命名時發生錯誤，請稍後再試。', 'error');
      }
      return;
    }

    if (payload.action === 'move') {
      if (payload.targetPrefix === undefined) return;
      try {
        const response = await authorizedFetch('/api/media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move',
            key: payload.key,
            targetPrefix: payload.targetPrefix,
            isFolder: payload.isFolder
          })
        });

        if (!response.ok) {
          pushMessage('移動失敗，請稍後再試', 'error');
          return;
        }

        pushMessage('已移動完成', 'success');
        setAdminAction(null);
        await loadMedia(payload.targetPrefix || currentPrefix);
      } catch (error) {
        pushMessage('移動時發生錯誤，請稍後再試。', 'error');
      }
      return;
    }

    try {
      const response = await authorizedFetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', key: payload.key, isFolder: payload.isFolder })
      });

      if (!response.ok) {
        pushMessage('刪除失敗，請稍後再試', 'error');
        return;
      }

      pushMessage('已刪除', 'success');
      setAdminAction(null);
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
        depth={depth}
      />

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">正在載入媒體…</div>
      )}

      {!loading && !hasItems && <EmptyState atMaxDepth={depth >= MAX_FOLDER_DEPTH} />}

      <FolderGrid
        folders={folders}
        isAdmin={isAdmin}
        onEnter={handleEnterFolder}
        onRename={(key) => openAdminActionModal('rename', key, true)}
        onMove={(key) => openAdminActionModal('move', key, true)}
        onDelete={(key) => openAdminActionModal('delete', key, true)}
      />

      <MediaSection
        allFilesCount={files.length}
        files={filteredFiles}
        paginatedFiles={paginatedFiles}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onSelect={(file, trigger) => {
          previewTriggerRef.current = trigger;
          setSelectedMedia(file);
        }}
        onRename={(key) => openAdminActionModal('rename', key, false)}
        onMove={(key) => openAdminActionModal('move', key, false)}
        onDelete={(key) => openAdminActionModal('delete', key, false)}
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

      <AdminActionModal
        action={adminAction?.action ?? null}
        target={adminAction?.target ?? null}
        currentPrefix={currentPrefix}
        maxDepth={MAX_FOLDER_DEPTH}
        maxNameLength={MAX_FOLDER_NAME_LENGTH}
        sanitizeName={sanitizeName}
        sanitizePath={sanitizePath}
        getDepth={getDepth}
        onCancel={() => setAdminAction(null)}
        onConfirm={handleAdminActionConfirm}
      />

      <MediaPreviewModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        triggerElement={previewTriggerRef.current}
      />
    </section>
  );
}
