'use client';

export function PathOverview({
  currentPrefix,
  folderCount,
  fileCount
}: {
  currentPrefix: string;
  folderCount: number;
  fileCount: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">目前路徑</p>
          <p className="text-xl font-bold text-white">{currentPrefix || '根目錄'}</p>
          <p className="text-xs text-slate-400">僅顯示兩層資料夾。善用下方導覽與篩選控制快速跳轉。</p>
        </div>
        <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20 whitespace-nowrap">
          {folderCount} 資料夾 · {fileCount} 媒體
        </div>
      </div>
    </div>
  );
}
