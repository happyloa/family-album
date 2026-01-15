'use client';

type Breadcrumb = { label: string; key: string };

export function BreadcrumbNav({
  breadcrumbTrail,
  currentPrefix,
  maxDepth,
  foldersCount,
  filesCount,
  onBack,
  onRefresh,
  onNavigate,
  loading,
  depth
}: {
  breadcrumbTrail: Breadcrumb[];
  currentPrefix: string;
  maxDepth: number;
  foldersCount: number;
  filesCount: number;
  onBack: () => void;
  onRefresh: () => void;
  onNavigate: (key: string) => void;
  loading: boolean;
  depth: number;
}) {
  return (
    <nav
      aria-label="路徑導覽"
      className="glass-card rounded-3xl border border-stone-700/50 bg-stone-900/70 px-5 py-4 text-sm text-stone-100 shadow-xl ring-1 ring-white/5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300 ring-1 ring-amber-500/30 whitespace-nowrap">
              {foldersCount} 資料夾 · {filesCount} 媒體
            </span>
            <span className="rounded-full bg-stone-800 px-3 py-1 text-stone-300 ring-1 ring-stone-700 whitespace-nowrap">
              深度 {depth} / {maxDepth}
            </span>
          </div>
          <div className="overflow-x-auto">
            <ol className="flex w-full items-center gap-2 text-sm font-semibold" aria-label="Breadcrumb">
              {breadcrumbTrail.map((crumb, index) => {
                const isLast = index === breadcrumbTrail.length - 1;
                return (
                  <li key={crumb.key} className="flex items-center gap-2">
                    <button
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isLast
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-50 shadow-glow'
                          : 'border-stone-700 bg-stone-800/60 text-stone-100 hover:border-amber-400/50 hover:bg-stone-800 hover:text-amber-100'
                        }`}
                      onClick={() => onNavigate(crumb.key)}
                      type="button"
                      disabled={isLast && currentPrefix === crumb.key}
                      aria-current={isLast ? 'page' : undefined}
                      title={crumb.label || '根目錄'}
                    >
                      <span aria-hidden>{index === 0 ? '🏠' : '📁'}</span>
                      <span className="max-w-[160px] truncate text-left">{crumb.label || '根目錄'}</span>
                      {isLast && (
                        <span className="whitespace-nowrap rounded-full bg-amber-500/25 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                          目前
                        </span>
                      )}
                    </button>
                    {index < breadcrumbTrail.length - 1 && <span aria-hidden className="text-stone-600">›</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <button
            className="rounded-xl border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 transition-all duration-200 hover:border-amber-500/50 hover:bg-stone-800 hover:text-amber-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onBack}
            disabled={!currentPrefix}
            type="button"
          >
            ← 返回上一層
          </button>
          <button
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-stone-950 shadow-glow transition-all duration-200 hover:from-amber-400 hover:to-orange-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onRefresh}
            disabled={loading}
            type="button"
          >
            {loading ? '載入中…' : '重新整理列表'}
          </button>
        </div>
      </div>
    </nav>
  );
}
