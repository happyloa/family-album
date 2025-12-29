'use client';

import { Suspense, useMemo, useState } from 'react';

import { UploadForm } from './UploadForm';
import { AdminAccessPanel } from './media/AdminAccessPanel';
import { AdminActionModal } from './media/AdminActionModal';
import { BreadcrumbNav } from './media/BreadcrumbNav';
import {
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
import { MediaSkeleton } from './media/MediaSkeleton';
import { MessageToast } from './media/MessageToast';
import { useAdminAuth } from './media/hooks/useAdminAuth';
import { useMediaActions } from './media/hooks/useMediaActions';
import { useMediaData } from './media/hooks/useMediaData';
import { useMediaDragDrop } from './media/hooks/useMediaDragDrop';
import { useMessage } from './media/hooks/useMessage';
import { getDepth, sanitizeName, sanitizePath } from './media/sanitize';
import { MediaFile } from './media/types';

type Breadcrumb = { label: string; key: string };

type PreviewState = {
  media: MediaFile | null;
  trigger: HTMLElement | null;
};

/**
 * MediaGrid Component: 專案核心元件
 * 整合了媒體瀏覽、資料夾導覽、管理員權限驗證、上傳與檔案操作功能。
 *
 * 為了避免 God Component 問題，邏輯已拆分為多個 Custom Hooks：
 * - useMessage: 處理全域訊息提示
 * - useMediaData: 處理 API 資料載入、過濾與分頁
 * - useAdminAuth: 處理管理員權限、Token 驗證與過期
 * - useMediaActions: 處理資料夾建立、重新命名與刪除等操作
 * - useMediaDragDrop: 處理拖曳移動檔案的邏輯
 */
export function MediaGrid({ refreshToken = 0 }: { refreshToken?: number }) {
  // 訊息提示 Hook
  const { message, messageTone, pushMessage } = useMessage();

  // 媒體資料與瀏覽狀態 Hook
  const {
    files,
    folders,
    loading,
    currentPrefix,
    setCurrentPrefix,
    loadMedia,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedFiles,
    filteredFiles,
    filterVisible,
    searchEnabled
  } = useMediaData({ pushMessage, refreshToken });

  // 管理員權限 Hook
  const {
    adminToken,
    adminInput,
    isAdmin,
    setAdminInput,
    validateAndApplyToken,
    clearAdminSession,
    requestAdminToken,
    authorizedFetch
  } = useAdminAuth({ pushMessage });

  // 檔案操作 Hook (建立、刪除、重新命名)
  const {
    newFolderName,
    setNewFolderName,
    handleCreateFolder,
    adminAction,
    setAdminAction,
    openAdminActionModal,
    handleAdminActionConfirm
  } = useMediaActions({
    authorizedFetch,
    requestAdminToken,
    pushMessage,
    loadMedia,
    currentPrefix
  });

  // 拖曳功能 Hook
  const { isDraggingMedia, handleMediaDragStart, handleMediaDragEnd, moveDraggedMediaTo } = useMediaDragDrop({
    isAdmin,
    currentPrefix,
    requestAdminToken,
    pushMessage,
    handleAdminActionConfirm
  });

  const [preview, setPreview] = useState<PreviewState>({ media: null, trigger: null });

  // 計算目前深度，防止超過兩層資料夾
  const depth = Math.min(getDepth(currentPrefix), MAX_FOLDER_DEPTH);

  // 產生麵包屑導覽結構
  const breadcrumbTrail: Breadcrumb[] = useMemo(() => {
    const parts = currentPrefix.split('/').filter(Boolean);
    const nested = parts.map((part, index, arr) => ({ label: part, key: arr.slice(0, index + 1).join('/') }));
    return [{ label: '根目錄', key: '' }, ...nested];
  }, [currentPrefix]);

  // 計算上一層路徑 (用於 "回到上一層" 功能)
  const parentPrefix = useMemo(() => {
    if (!currentPrefix) return null;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  }, [currentPrefix]);

  // 進入資料夾
  const handleEnterFolder = (folderKey: string) => {
    if (getDepth(folderKey) > MAX_FOLDER_DEPTH) {
      pushMessage('資料夾層數最多兩層', 'error');
      return;
    }

    pushMessage('', 'info'); // 清空訊息
    setCurrentPrefix(folderKey);
  };

  // 回到上一層
  const handleBack = () => {
    if (!currentPrefix) return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.join('/'));
  };

  const handleSaveAdminToken = () => {
    void validateAndApplyToken(adminInput);
  };

  const handleClearAdminToken = () => {
    clearAdminSession('已退出管理模式');
  };

  const hasItems = files.length > 0 || folders.length > 0;
  const filterLabel = filterVisible ? (filter === 'all' ? '全部' : filter === 'image' ? '僅圖片' : '僅影片') : '全部';

  return (
    <section className="relative space-y-5">
      <MessageToast message={message} tone={messageTone} />

      {/* 控制面板：顯示標題與管理員登入區塊 */}
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

        <div className="mt-6">
          <AdminAccessPanel
            isAdmin={isAdmin}
            adminInput={adminInput}
            maxLength={MAX_ADMIN_TOKEN_LENGTH}
            onValidate={handleSaveAdminToken}
            onClear={handleClearAdminToken}
            onInputChange={setAdminInput}
          />
        </div>

        {/* 管理功能區：建立資料夾與上傳 (僅管理員可見) */}
        {isAdmin && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <FolderCreator
              value={newFolderName}
              onChange={(value) => setNewFolderName(sanitizeName(value))}
              onSubmit={handleCreateFolder}
            />
            <UploadForm adminToken={adminToken} currentPath={currentPrefix} onUploaded={() => loadMedia(currentPrefix)} />
          </div>
        )}
      </div>

      {/* 導覽列：麵包屑與重新整理按鈕 */}
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

      {/* 拖曳區：拖曳檔案到上一層 */}
      {isAdmin && isDraggingMedia && parentPrefix !== null && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-emerald-400/70 bg-emerald-500/10 px-4 py-3 text-emerald-50"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            event.preventDefault();
            void moveDraggedMediaTo(parentPrefix);
          }}
          role="button"
          aria-label="將媒體放到上一層"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-lg">⬆️</span>
            <span>放到上一層</span>
          </div>
          <p className="text-xs text-emerald-100/80">將拖曳中的媒體移動到「{parentPrefix || '根目錄'}」</p>
        </div>
      )}

      {loading ? (
        <MediaSkeleton />
      ) : (
        <>
          {!hasItems && <EmptyState atMaxDepth={depth >= MAX_FOLDER_DEPTH} />}

          <FolderGrid
            folders={folders}
            isAdmin={isAdmin}
            onEnter={handleEnterFolder}
            onRename={(key) => openAdminActionModal('rename', key, true)}
            onDelete={(key) => openAdminActionModal('delete', key, true)}
            canDropMedia={isAdmin && isDraggingMedia}
            onDropMedia={(targetKey) => void moveDraggedMediaTo(targetKey)}
          />

          <MediaSection
            allFilesCount={files.length}
            files={filteredFiles}
            paginatedFiles={paginatedFiles}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onSelect={(file, trigger) => {
              setPreview({ media: file, trigger });
            }}
            onRename={(key) => openAdminActionModal('rename', key, false)}
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
            onDragStart={handleMediaDragStart}
            onDragEnd={handleMediaDragEnd}
          />
        </>
      )}

      {/* 管理操作確認對話框 (刪除、移動、更名) */}
      <AdminActionModal
        key={adminAction ? `${adminAction.action}-${adminAction.target.key}-${currentPrefix}` : 'idle'}
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

      {/* 媒體預覽彈窗 */}
      <MediaPreviewModal
        media={preview.media}
        onClose={() => setPreview({ media: null, trigger: null })}
        triggerElement={preview.trigger}
      />
    </section>
  );
}
