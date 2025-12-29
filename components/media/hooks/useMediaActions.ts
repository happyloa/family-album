import { useState } from 'react';

import { AdminActionTarget, AdminActionType } from '../AdminActionModal';
import { MAX_FOLDER_DEPTH, MAX_FOLDER_NAME_LENGTH } from '../constants';
import { getDepth, sanitizeName } from '../sanitize';

type UseMediaActionsProps = {
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  requestAdminToken: (promptMessage?: string) => Promise<boolean>;
  pushMessage: (text: string, tone: 'info' | 'success' | 'error') => void;
  loadMedia: (prefix: string) => Promise<void>;
  currentPrefix: string;
};

export function useMediaActions({
  authorizedFetch,
  requestAdminToken,
  pushMessage,
  loadMedia,
  currentPrefix
}: UseMediaActionsProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [adminAction, setAdminAction] = useState<{ action: AdminActionType; target: AdminActionTarget } | null>(null);

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

  return {
    newFolderName,
    setNewFolderName,
    handleCreateFolder,
    adminAction,
    setAdminAction,
    openAdminActionModal,
    handleAdminActionConfirm
  };
}
