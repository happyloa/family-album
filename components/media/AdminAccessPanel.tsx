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
    <div className="w-full rounded-2xl border border-surface-700/50 bg-surface-800/50 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-400">安全管理</p>
          <h3 className="text-lg font-semibold text-white">
            {isAdmin ? '管理模式已啟用，可上傳與編輯' : '輸入管理密碼啟用編輯權限'}
          </h3>
          <p className="mt-1 text-xs text-surface-500">
            {isAdmin ? '完成操作後請記得關閉管理模式，避免誤刪除或誤上傳。' : '僅需管理者密碼即可啟用上傳、移動與刪除功能。'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 whitespace-nowrap ${isAdmin ? 'bg-primary-500/15 text-primary-200 ring-primary-500/40' : 'bg-surface-800 text-surface-300 ring-surface-600'
            }`}
        >
          {isAdmin ? '管理模式開啟' : '唯讀模式'}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {isAdmin ? (
          <button
            className="inline-flex w-full items-center justify-center rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-red-400/40 transition-all duration-200 hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300/60 cursor-pointer"
            type="button"
            onClick={onClear}
          >
            退出管理模式
          </button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <input
              className="w-full rounded-xl border border-surface-700 bg-surface-900/80 px-4 py-3 text-sm text-surface-100 placeholder:text-surface-500 transition-all duration-200 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              type="password"
              maxLength={maxLength}
              value={adminInput}
              placeholder="輸入管理密碼以進行上傳與修改"
              onChange={(event) => onInputChange(event.target.value)}
            />
            <button
              className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2.5 text-sm font-semibold text-surface-950 shadow-glow transition-all duration-200 hover:from-primary-400 hover:to-primary-500 cursor-pointer"
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
