'use client';

const folderPlaceholders = Array.from({ length: 3 });
const mediaPlaceholders = Array.from({ length: 8 });

export function MediaSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="媒體載入中骨架畫面">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 rounded bg-slate-800/80" />
          <div className="h-5 w-28 rounded-full bg-emerald-700/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folderPlaceholders.map((_, index) => (
            <div
              key={`folder-skeleton-${index}`}
              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-800" />
                <div className="w-full space-y-2">
                  <div className="h-4 w-28 rounded bg-slate-800/90" />
                  <div className="h-3 w-36 rounded bg-slate-800/70" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-16 rounded-full bg-slate-800/80" />
                <div className="h-6 w-16 rounded-full bg-rose-800/50" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-6 w-24 rounded bg-slate-800/80" />
          <div className="h-5 w-28 rounded-full bg-cyan-700/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mediaPlaceholders.map((_, index) => (
            <div
              key={`media-skeleton-${index}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg animate-pulse"
            >
              <div className="h-40 bg-slate-800/70" />
              <div className="flex flex-col gap-3 p-4">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-800/90" />
                  <div className="h-3 w-1/2 rounded bg-slate-800/70" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-16 rounded-full bg-slate-800/80" />
                  <div className="h-6 w-16 rounded-full bg-rose-800/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
