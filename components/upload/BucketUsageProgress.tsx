'use client';

type BucketUsageProgressProps = {
    bucketUsageBytes: number | null;
    bucketLimitBytes: number;
    usageLoading: boolean;
    usageError: string;
};

/**
 * BucketUsageProgress: 顯示貯體使用量進度條
 */
export function BucketUsageProgress({
    bucketUsageBytes,
    bucketLimitBytes,
    usageLoading,
    usageError
}: BucketUsageProgressProps) {
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / 1024 ** index;
        return `${value.toFixed(value >= 10 ? 0 : 2)}${units[index]}`;
    };

    const totalUsageBytes = bucketUsageBytes ?? 0;
    const overLimit = bucketUsageBytes !== null && totalUsageBytes > bucketLimitBytes;
    const usagePercent = Math.min((totalUsageBytes / bucketLimitBytes) * 100, 150);
    const usageLabel =
        bucketUsageBytes === null
            ? usageLoading
                ? '讀取中...'
                : '—'
            : `${formatBytes(totalUsageBytes)} / ${formatBytes(bucketLimitBytes)}`;

    return (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
                <span>目前貯體用量</span>
                <span className={overLimit ? 'text-cyan-200' : 'text-emerald-100'}>{usageLabel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${overLimit ? 'bg-gradient-to-r from-cyan-400 to-rose-500' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                        }`}
                    style={{ width: `${usagePercent}%` }}
                />
            </div>
            <p className="text-xs text-slate-400">
                已含所有資料夾中的媒體總大小；若超過限額，請先清理空間後再上傳。
            </p>
            {usageError ? <p className="text-xs font-semibold text-cyan-200">{usageError}</p> : null}
        </div>
    );
}
