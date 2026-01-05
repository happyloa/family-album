'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  MAX_IMAGE_SIZE_MB,
  MAX_VIDEO_SIZE_MB,
  getSizeLimitByMime
} from '@/lib/upload/constants';

/**
 * UploadForm: 檔案上傳表單
 * 負責處理：
 * 1. 檔案選取與驗證 (MIME Type, Size)
 * 2. 圖片前端壓縮 (使用 Canvas)
 * 3. 顯示本次上傳容量
 * 4. 上傳進度條與狀態提示
 */
export function UploadForm({
  onUploaded,
  currentPath = '',
  adminToken = ''
}: {
  onUploaded?: () => void;
  currentPath?: string;
  adminToken?: string;
}) {
  // 使用陣列保存檔案，方便一次上傳多個媒體
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>('');
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error'>('info');
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState(currentPath);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resetFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_TOTAL_SIZE_MB = 400;
  const BUCKET_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10GB

  const updateStatus = (text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setStatus(text);
    setStatusTone(tone);
  };

  useEffect(() => {
    setPath(currentPath);
  }, [currentPath]);

  useEffect(() => {
    return () => {
      if (resetFeedbackTimeout.current) {
        clearTimeout(resetFeedbackTimeout.current);
      }
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toFixed(value >= 10 ? 0 : 2)}${units[index]}`;
  };

  const formatSizeLabel = (sizeMb: number) => {
    if (!Number.isFinite(sizeMb)) return '';
    return Number.isInteger(sizeMb) ? `${sizeMb}MB` : `${sizeMb.toFixed(1)}MB`;
  };

  const imageSizeLabel = formatSizeLabel(MAX_IMAGE_SIZE_MB);
  const videoSizeLabel = formatSizeLabel(MAX_VIDEO_SIZE_MB);

  const selectedBytes = files.reduce((sum, file) => sum + file.size, 0);
  const overLimit = selectedBytes > BUCKET_LIMIT_BYTES;
  const usagePercent = Math.min((selectedBytes / BUCKET_LIMIT_BYTES) * 100, 150);
  const usageLabel = `${formatBytes(selectedBytes)} / 10GB`;

  // 針對圖片使用 canvas 降解析度後輸出，降低檔案大小
  const compressImage = async (file: File) => {
    try {
      const image = await createImageBitmap(file);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return file;

      const maxWidth = 1920;
      const maxHeight = 1920;
      const ratio = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const targetWidth = Math.round(image.width * ratio);
      const targetHeight = Math.round(image.height * ratio);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((result) => resolve(result), 'image/webp', 0.82)
      );

      if (!blob) return file;

      const compressedName = file.name.replace(/\.[^.]+$/, '.webp');
      return new File([blob], compressedName, { type: 'image/webp' });
    } catch (error) {
      updateStatus('圖片壓縮失敗，已改用原始檔案。', 'error');
      return file;
    }
  };

  // 根據媒體型態決定處理方式：圖片壓縮，影片維持原始品質
  const compressMedia = async (file: File) => {
    if (file.type.startsWith('image/')) return compressImage(file);
    return file;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files.length) {
      updateStatus('請先選擇要上傳的檔案', 'error');
      return;
    }

    const totalSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
    const oversized = files.filter((file) => {
      const limit = getSizeLimitByMime(file.type);
      return typeof limit === 'number' && file.size > limit;
    });
    if (oversized.length > 0) {
      updateStatus(
        `有 ${oversized.length} 個檔案超過大小上限（圖片 ${imageSizeLabel}、影片 ${videoSizeLabel}），請調整後再上傳。`,
        'error'
      );
      return;
    }

    if (totalSizeBytes > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
      updateStatus(`總容量超過 ${MAX_TOTAL_SIZE_MB}MB，請分批上傳。`, 'error');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator && !navigator.onLine) {
      updateStatus('目前處於離線狀態，請恢復網路後再試。', 'error');
      return;
    }

    if (overLimit) {
      const confirmed = window.confirm('本次上傳容量估計已超過 10GB，確定要繼續嗎？');
      if (!confirmed) {
        updateStatus('已取消上傳。', 'info');
        return;
      }
    }

    setLoading(true);
    setProgress(0);
    updateStatus('壓縮與上傳中...', 'info');

    const compressedFiles: File[] = [];

    try {
      for (const file of files) {
        const compressed = await compressMedia(file);
        compressedFiles.push(compressed);
      }

      const safePath = path.trim().replace(/^\/+|\/+$/g, '');
      const formData = new FormData();
      compressedFiles.forEach((mediaFile) => formData.append('files', mediaFile));
      formData.append('path', safePath);

      const response = await new Promise<Response>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', '/api/upload');

        if (adminToken) {
          request.setRequestHeader('x-admin-token', adminToken);
        }

        request.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            updateStatus('上傳中...', 'info');
            return;
          }

          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
          updateStatus(`上傳中... ${percent}%`, 'info');
        };

        request.onload = () => {
          resolve(new Response(request.response, { status: request.status, statusText: request.statusText }));
        };

        request.onerror = () => {
          reject(new Error('上傳時發生錯誤'));
        };

        request.onabort = () => {
          reject(new Error('上傳已被中止'));
        };

        request.send(formData);
      });

      if (!response.ok) {
        updateStatus('上傳失敗，請稍後再試。', 'error');
        setProgress(0);
      } else {
        updateStatus('完成！', 'success');
        setProgress(100);
        setFiles([]);
        setPath(currentPath);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onUploaded?.();
        if (resetFeedbackTimeout.current) {
          clearTimeout(resetFeedbackTimeout.current);
        }
        resetFeedbackTimeout.current = setTimeout(() => {
          setProgress(0);
          setStatus('');
          setStatusTone('info');
        }, 5000);

      }
    } catch (error) {
      updateStatus('上傳時發生錯誤，請稍後再試。', 'error');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">上傳家庭回憶</p>
        <h3 className="text-lg font-semibold text-white">照片、影片直接存到 Cloudflare R2</h3>
        <p className="text-sm text-slate-400">支援圖片與影片，上傳前會自動壓縮以節省流量，完成後清單會自動刷新。</p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
          <span>本次上傳容量（前端估算）</span>
          <span className={overLimit ? 'text-amber-200' : 'text-emerald-100'}>{usageLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overLimit ? 'bg-gradient-to-r from-amber-400 to-rose-500' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">不包含既有檔案，僅計算此批選取的媒體總大小。</p>
      </div>
      <label className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">選擇檔案</span>
        <input
          className="w-full text-sm text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-200 hover:file:bg-emerald-500/25"
          type="file"
          accept="image/*,video/*"
          multiple
          ref={fileInputRef}
          onChange={(event) => {
            const rawFiles = Array.from(event.target.files ?? []);
            const selected = rawFiles.filter((media) => media.type.startsWith('image/') || media.type.startsWith('video/'));
            const skippedByType = rawFiles.length - selected.length;
            const oversized = selected.filter((file) => {
              const limit = getSizeLimitByMime(file.type);
              return typeof limit === 'number' && file.size > limit;
            });
            const valid = selected.filter((file) => {
              const limit = getSizeLimitByMime(file.type);
              return typeof limit === 'number' && file.size <= limit;
            });
            const totalSizeBytes = valid.reduce((sum, file) => sum + file.size, 0);

            if (totalSizeBytes > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
              updateStatus(`總容量超過 ${MAX_TOTAL_SIZE_MB}MB，請分批上傳。`, 'error');
              setFiles([]);
              return;
            }

            const hints: string[] = [];
            if (skippedByType > 0) hints.push(`已略過 ${skippedByType} 個不符合格式的檔案`);
            if (oversized.length > 0) {
              hints.push(`${oversized.length} 個超過大小上限（圖片 ${imageSizeLabel}、影片 ${videoSizeLabel}）已跳過`);
            }

            updateStatus(hints.join('；'), oversized.length > 0 ? 'error' : 'info');
            setFiles(valid);
          }}
        />
        <p className="text-xs text-slate-400">圖片上限 {imageSizeLabel}，影片上限 {videoSizeLabel}（依設定值）。</p>
        {files.length > 0 && (
          <div className="space-y-1 text-emerald-200">
            <p className="font-semibold">已選擇 {files.length} 個檔案：</p>
            <ul className="list-disc space-y-1 pl-4 text-emerald-100">
              {files.map((file) => (
                <li key={file.name}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </label>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">目標資料夾（預設根目錄）</p>
        <input
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          type="text"
          value={path}
          placeholder="例如：travel/2024"
          onChange={(event) => setPath(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-cyan-300 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={!files.length || loading}
        >
          {loading ? '處理中...' : '上傳檔案'}
        </button>
        {(loading || progress > 0) && (
          <div className="flex w-full flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
              <span>上傳進度</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {status && (
          <p
            className={`text-sm font-semibold ${
              statusTone === 'success'
                ? 'text-emerald-200'
                : statusTone === 'error'
                  ? 'text-rose-200'
                  : 'text-cyan-200'
            }`}
            aria-live="polite"
          >
            {status}
          </p>
        )}
      </div>
    </form>
  );
}
