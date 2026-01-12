'use client';

type UploadProgressProps = {
    progress: number;
    isLoading: boolean;
};

/**
 * UploadProgress: 上傳進度條元件
 */
export function UploadProgress({ progress, isLoading }: UploadProgressProps) {
    if (!isLoading && progress === 0) return null;

    return (
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
    );
}
