'use client';

export function FolderCreator({
  value,
  onChange,
  onSubmit
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-700/50 bg-stone-800/50 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-400">建立資料夾</p>
          <h3 className="text-lg font-semibold text-white">整理新的分類</h3>
          <p className="text-sm text-stone-400">會在 R2 中建立虛擬資料夾，方便依照旅行、年份或活動分類。</p>
          <p className="text-xs text-stone-500">資料夾層級最多兩層，名稱最多 30 個字。</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <input
          className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 transition-all duration-200 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          type="text"
          value={value}
          placeholder="輸入資料夾名稱（例如：taiwan-trip）"
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="inline-flex h-full min-h-[52px] cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-stone-950 shadow-glow transition-all duration-200 hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          onClick={onSubmit}
        >
          建立
        </button>
      </div>
    </div>
  );
}
