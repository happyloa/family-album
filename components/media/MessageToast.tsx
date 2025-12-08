'use client';

import { MessageTone } from './types';

const toneStyles: Record<MessageTone, string> = {
  info: 'border-cyan-400/40 bg-slate-950/90 text-cyan-50 shadow-lg shadow-cyan-500/15',
  success: 'border-emerald-400/50 bg-emerald-950/70 text-emerald-50 shadow-lg shadow-emerald-500/25',
  error: 'border-rose-400/50 bg-rose-950/70 text-rose-50 shadow-lg shadow-rose-500/25'
};

export function MessageToast({ message, tone }: { message: string; tone: MessageTone }) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-3 sm:right-6 sm:top-6">
      <div
        className={`pointer-events-auto w-72 rounded-2xl px-4 py-3 text-sm font-semibold ${toneStyles[tone]}`}
        role="status"
        aria-live="assertive"
      >
        <span className="block text-xs uppercase tracking-[0.12em] text-slate-300">即時提醒</span>
        <span className="block text-base leading-relaxed text-white">{message}</span>
      </div>
    </div>
  );
}
