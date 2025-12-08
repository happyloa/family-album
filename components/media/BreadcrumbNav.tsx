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
      className="glass-card rounded-3xl border border-slate-800/80 bg-slate-900/70 px-5 py-4 text-sm text-slate-100 shadow-2xl ring-1 ring-white/10"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200 ring-1 ring-emerald-500/30 whitespace-nowrap">
              {foldersCount} 資料夾 · {filesCount} 媒體
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300 ring-1 ring-slate-700 whitespace-nowrap">
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
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${
                        isLast
                          ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-50 shadow-glow'
                          : 'border-slate-700 bg-slate-900/60 text-slate-100 hover:border-emerald-300 hover:text-emerald-100'
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
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-50">目前</span>
                      )}
                    </button>
                    {index < breadcrumbTrail.length - 1 && <span aria-hidden className="text-slate-500">›</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <button
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onBack}
            disabled={!currentPrefix}
            type="button"
          >
            ← 返回上一層
          </button>
          <button
            className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
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
