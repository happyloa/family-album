'use client';

import { useRef } from 'react';

import { getSizeLimitByMime } from '@/lib/upload/constants';

type FileSelectedListProps = {
    files: File[];
};

/**
 * FileSelectedList: 顯示已選取的檔案清單
 */
export function FileSelectedList({ files }: FileSelectedListProps) {
    if (files.length === 0) return null;

    return (
        <div className="space-y-1 text-emerald-200">
            <p className="font-semibold">已選擇 {files.length} 個檔案：</p>
            <ul className="list-disc space-y-1 pl-4 text-emerald-100">
                {files.map((file) => (
                    <li key={file.name}>{file.name}</li>
                ))}
            </ul>
        </div>
    );
}

type FileInputProps = {
    files: File[];
    setFiles: (files: File[]) => void;
    updateStatus: (text: string, tone: 'info' | 'success' | 'error') => void;
    imageSizeLabel: string;
    videoSizeLabel: string;
    maxTotalSizeMB: number;
};

/**
 * FileInput: 檔案選取輸入元件
 */
export function FileInput({
    files,
    setFiles,
    updateStatus,
    imageSizeLabel,
    videoSizeLabel,
    maxTotalSizeMB
}: FileInputProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

        if (totalSizeBytes > maxTotalSizeMB * 1024 * 1024) {
            updateStatus(`總容量超過 ${maxTotalSizeMB}MB，請分批上傳。`, 'error');
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
    };

    return (
        <label className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">選擇檔案</span>
            <input
                className="w-full text-sm text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-200 hover:file:bg-emerald-500/25"
                type="file"
                accept="image/*,video/*"
                multiple
                ref={fileInputRef}
                onChange={handleChange}
            />
            <p className="text-xs text-slate-400">圖片上限 {imageSizeLabel}，影片上限 {videoSizeLabel}（依設定值）。</p>
            <FileSelectedList files={files} />
        </label>
    );
}
