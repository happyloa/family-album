import { DragEvent, useState } from 'react';

import { AdminActionType } from '../AdminActionModal';
import { MAX_FOLDER_DEPTH } from '../constants';
import { getDepth, sanitizePath } from '../sanitize';
import { MediaFile } from '../types';

type UseMediaDragDropProps = {
  isAdmin: boolean;
  currentPrefix: string;
  requestAdminToken: (promptMessage?: string) => Promise<boolean>;
  pushMessage: (text: string, tone: 'info' | 'success' | 'error') => void;
  handleAdminActionConfirm: (payload: {
    action: AdminActionType;
    key: string;
    isFolder: boolean;
    targetPrefix?: string;
  }) => Promise<void>;
};

export function useMediaDragDrop({
  isAdmin,
  currentPrefix,
  requestAdminToken,
  pushMessage,
  handleAdminActionConfirm
}: UseMediaDragDropProps) {
  const [draggingMedia, setDraggingMedia] = useState<MediaFile | null>(null);

  const handleMediaDragStart = (file: MediaFile, event: DragEvent<HTMLElement>) => {
    if (!isAdmin) return;
    event.dataTransfer.effectAllowed = 'move';
    setDraggingMedia(file);
  };

  const handleMediaDragEnd = () => {
    setDraggingMedia(null);
  };

  const moveDraggedMediaTo = async (targetPrefix: string) => {
    if (!draggingMedia || !isAdmin) return;

    const sanitizedTarget = sanitizePath(targetPrefix);
    const targetDepth = getDepth(sanitizedTarget);

    if (targetDepth > MAX_FOLDER_DEPTH) {
      pushMessage('路徑深度超過限制，無法移動', 'error');
      return;
    }

    if (sanitizedTarget === currentPrefix) {
      pushMessage('媒體已在此資料夾', 'info');
      return;
    }

    const allowed = await requestAdminToken('請輸入管理密碼以移動項目');
    if (!allowed) return;

    await handleAdminActionConfirm({
      action: 'move',
      key: draggingMedia.key,
      isFolder: false,
      targetPrefix: sanitizedTarget
    });

    setDraggingMedia(null);
  };

  return {
    draggingMedia,
    isDraggingMedia: Boolean(draggingMedia),
    handleMediaDragStart,
    handleMediaDragEnd,
    moveDraggedMediaTo
  };
}
