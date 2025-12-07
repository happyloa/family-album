'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState(currentPath);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resetFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 針對圖片使用 canvas 降解析度後輸出，降低檔案大小
  const compressImage = async (file: File) => {
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
  };

  // 根據媒體型態決定處理方式：圖片壓縮，影片維持原始品質
  const compressMedia = async (file: File) => {
    if (file.type.startsWith('image/')) return compressImage(file);
    return file;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files.length) return;
    setLoading(true);
    setProgress(0);
    setStatus('壓縮與上傳中...');

    const compressedFiles: File[] = [];

    for (const file of files) {
      const compressed = await compressMedia(file);
      compressedFiles.push(compressed);
    }

    const formData = new FormData();
    compressedFiles.forEach((mediaFile) => formData.append('files', mediaFile));
    formData.append('path', path);

    const response = await new Promise<Response>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', '/api/upload');

      if (adminToken) {
        request.setRequestHeader('x-admin-token', adminToken);
      }

      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          setStatus('上傳中...');
          return;
        }

        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
        setStatus(`上傳中... ${percent}%`);
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
      setStatus('上傳失敗，請稍後再試。');
      setProgress(0);
    } else {
      setStatus('完成！');
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
      }, 5000);
    }
    setLoading(false);
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
      <label className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">選擇檔案</span>
        <input
          className="w-full text-sm text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-200 hover:file:bg-emerald-500/25"
          type="file"
          accept="image/*,video/*"
          multiple
          ref={fileInputRef}
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []).filter((media) =>
              media.type.startsWith('image/') || media.type.startsWith('video/')
            );
            // 只接受圖片與影片，並以繁體提示
            setStatus(
              selected.length !== (event.target.files?.length ?? 0)
                ? '已略過不符合格式的檔案'
                : ''
            );
            setFiles(selected);
          }}
        />
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
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-cyan-300 hover:to-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
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
        {status && <p className="text-sm font-semibold text-emerald-200">{status}</p>}
      </div>
    </form>
  );
}
