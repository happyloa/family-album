'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

export type AdminActionType = 'rename' | 'move' | 'delete';

export type AdminActionTarget = {
  key: string;
  isFolder: boolean;
};

type AdminActionModalProps = {
  action: AdminActionType | null;
  target: AdminActionTarget | null;
  currentPrefix: string;
  maxDepth: number;
  maxNameLength: number;
  sanitizeName: (value: string) => string;
  sanitizePath: (value: string) => string;
  getDepth: (path: string) => number;
  onCancel: () => void;
  onConfirm: (payload: {
    action: AdminActionType;
    key: string;
    isFolder: boolean;
    newName?: string;
    targetPrefix?: string;
  }) => void;
};

const ACTION_TITLE: Record<AdminActionType, string> = {
  rename: '重新命名',
  move: '移動項目',
  delete: '刪除項目'
};

export function AdminActionModal({
  action,
  target,
  currentPrefix,
  maxDepth,
  maxNameLength,
  sanitizeName,
  sanitizePath,
  getDepth,
  onCancel,
  onConfirm
}: AdminActionModalProps) {
  const currentName = useMemo(() => {
    if (!target) return '';
    return target.key.split('/').pop() ?? target.key;
  }, [target]);

  const { baseName, extension } = useMemo(() => {
    if (!target) return { baseName: '', extension: '' };
    const extensionIndex = target.isFolder ? -1 : currentName.lastIndexOf('.');
    if (extensionIndex > -1) {
      return { baseName: currentName.slice(0, extensionIndex), extension: currentName.slice(extensionIndex) };
    }
    return { baseName: currentName, extension: '' };
  }, [currentName, target]);

  const initialInputValue = useMemo(() => {
    if (!action || !target) return '';
    if (action === 'rename') return baseName;
    if (action === 'move') return currentPrefix;
    return '';
  }, [action, target, baseName, currentPrefix]);

  const [inputValue, setInputValue] = useState(initialInputValue);

  useEffect(() => {
    setInputValue(initialInputValue);
  }, [initialInputValue]);

  const { errorMessage, helperMessage, sanitizedName, sanitizedPath } = useMemo(() => {
    if (!action || !target) {
      return { errorMessage: '', helperMessage: '', sanitizedName: '', sanitizedPath: '' };
    }

    if (action === 'rename') {
      const trimmed = inputValue.trim();
      const sanitized = sanitizeName(trimmed);
      if (!sanitized) {
        return { errorMessage: '名稱不能為空', helperMessage: '', sanitizedName: sanitized, sanitizedPath: '' };
      }

      if (target.isFolder && sanitized.length > maxNameLength) {
        return {
          errorMessage: `資料夾名稱最多 ${maxNameLength} 個字`,
          helperMessage: '',
          sanitizedName: sanitized,
          sanitizedPath: ''
        };
      }

      if (sanitized === baseName) {
        return { errorMessage: '名稱未變更', helperMessage: '', sanitizedName: sanitized, sanitizedPath: '' };
      }

      return { errorMessage: '', helperMessage: '套用後名稱會自動移除特殊字元', sanitizedName: sanitized, sanitizedPath: '' };
    }

    if (action === 'move') {
      const trimmed = inputValue.trim();
      const sanitized = sanitizePath(trimmed);

      if (trimmed && !sanitized) {
        return { errorMessage: '路徑不能為空，請輸入有效資料夾', helperMessage: '', sanitizedName: '', sanitizedPath: '' };
      }

      const depth = getDepth(sanitized);
      if (depth > maxDepth) {
        return {
          errorMessage: `路徑深度最多 ${maxDepth} 層`,
          helperMessage: '',
          sanitizedName: '',
          sanitizedPath: sanitized
        };
      }

      if (target.isFolder && depth + 1 > maxDepth) {
        return {
          errorMessage: `移動後會超過 ${maxDepth} 層`,
          helperMessage: '',
          sanitizedName: '',
          sanitizedPath: sanitized
        };
      }

      if (trimmed && sanitized === currentPrefix) {
        return {
          errorMessage: '目標路徑與目前位置相同',
          helperMessage: '',
          sanitizedName: '',
          sanitizedPath: sanitized
        };
      }

      return {
        errorMessage: '',
        helperMessage: trimmed ? '已套用路徑整理規則' : '留空表示移動到根目錄',
        sanitizedName: '',
        sanitizedPath: sanitized
      };
    }

    return { errorMessage: '', helperMessage: '', sanitizedName: '', sanitizedPath: '' };
  }, [action, target, inputValue, sanitizeName, sanitizePath, maxNameLength, baseName, maxDepth, currentPrefix, getDepth]);

  if (!action || !target) return null;

  const confirmDisabled = Boolean(errorMessage);
  const finalName = sanitizedName ? `${sanitizedName}${extension}` : '';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmDisabled) return;

    if (action === 'rename') {
      onConfirm({ action, key: target.key, isFolder: target.isFolder, newName: finalName });
      return;
    }

    if (action === 'move') {
      onConfirm({ action, key: target.key, isFolder: target.isFolder, targetPrefix: sanitizedPath });
      return;
    }

    onConfirm({ action, key: target.key, isFolder: target.isFolder });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen w-screen items-center justify-center bg-slate-950/80 p-4 backdrop-blur"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-[min(560px,92vw)] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/95 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">管理操作</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{ACTION_TITLE[action]}</h3>
          <p className="mt-1 text-sm text-slate-400">對象：{currentName || target.key}</p>
        </div>

        <form className="space-y-4 px-5 py-4" onSubmit={handleSubmit}>
          {action === 'rename' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="rename-input">
                新名稱
              </label>
              <input
                id="rename-input"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="輸入新的檔案或資料夾名稱（支援表情符號）"
              />
              {finalName && (
                <p className="text-xs text-slate-400">完成後名稱：{finalName}</p>
              )}
            </div>
          )}

          {action === 'move' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="move-input">
                目標路徑
              </label>
              <input
                id="move-input"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="例如 albums/2024"
              />
              <p className="text-xs text-slate-400">整理後路徑：{sanitizedPath || '根目錄'}</p>
            </div>
          )}

          {action === 'delete' && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              確認刪除{target.isFolder ? '資料夾及其內容' : '此檔案'}？此操作無法復原。
            </div>
          )}

          <ul className="space-y-1 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
            {action === 'rename' && (
              <>
                <li>會自動移除特殊字元：&lt;&gt;:&quot;/\\|?*</li>
                {target.isFolder && <li>資料夾名稱最多 {maxNameLength} 個字</li>}
              </>
            )}
            {action === 'move' && (
              <>
                <li>路徑最多 {maxDepth} 層（例如 albums/2024）</li>
                <li>會自動移除特殊字元：&lt;&gt;:&quot;/\\|?*</li>
                <li>留空表示移動到根目錄</li>
              </>
            )}
            {action === 'delete' && <li>刪除後需要重新上傳才能還原</li>}
          </ul>

          {errorMessage && <p className="text-sm text-rose-300">{errorMessage}</p>}
          {!errorMessage && helperMessage && <p className="text-sm text-emerald-200">{helperMessage}</p>}

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
            <button
              className="rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 cursor-pointer"
              type="button"
              onClick={onCancel}
            >
              取消
            </button>
            <button
              className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={confirmDisabled}
            >
              確認
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
