'use client';

export function UndoToast({
  open,
  count,
  onUndo
}: {
  open: boolean;
  count: number;
  onUndo: () => void;
}) {
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-surface-700/60 bg-surface-900/95 py-2.5 pl-4 pr-2.5 shadow-2xl ring-1 ring-white/5 backdrop-blur-md animate-modal-content-in">
        <span className="text-sm font-semibold text-white">已刪除 {count} 個項目</span>
        <button
          type="button"
          onClick={onUndo}
          className="flex items-center gap-1.5 rounded-xl bg-primary-500/15 px-3 py-1.5 text-sm font-semibold text-primary-200 transition-colors hover:bg-primary-500/25 hover:text-primary-100 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 010 10h-1M3 10l4-4M3 10l4 4" />
          </svg>
          復原
        </button>
      </div>
    </div>
  );
}
