'use client';

export function AdminAccessPanel({
  isAdmin,
  adminInput,
  maxLength,
  onValidate,
  onClear,
  onInputChange
}: {
  isAdmin: boolean;
  adminInput: string;
  maxLength: number;
  onValidate: () => void;
  onClear: () => void;
  onInputChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">安全管理</p>
          <h3 className="text-lg font-semibold text-white">
            {isAdmin ? '管理模式已啟用，可上傳與編輯' : '輸入管理密碼啟用編輯權限'}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {isAdmin ? '完成操作後請記得關閉管理模式，避免誤刪除或誤上傳。' : '僅需管理者密碼即可啟用上傳、移動與刪除功能。'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 whitespace-nowrap ${
            isAdmin ? 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/40' : 'bg-slate-800 text-slate-200 ring-slate-600'
          }`}
        >
          {isAdmin ? '管理模式開啟' : '唯讀模式'}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {isAdmin ? (
          <button
            className="inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-rose-300/40 transition hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300/60"
            type="button"
            onClick={onClear}
          >
            退出管理模式
          </button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              type="password"
              maxLength={maxLength}
              value={adminInput}
              placeholder="輸入管理密碼以進行上傳與修改"
              onChange={(event) => onInputChange(event.target.value)}
            />
            <button
              className="rounded-lg bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-cyan-300 hover:to-emerald-300"
              type="button"
              onClick={onValidate}
            >
              驗證管理密碼
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
