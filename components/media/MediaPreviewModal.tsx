'use client';

import Image from 'next/image';
import { MediaFile } from './types';

export function MediaPreviewModal({ media, onClose }: { media: MediaFile | null; onClose: () => void }) {
  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[90vh] w-[min(1100px,92vw)] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/95 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{media.key.split('/').pop()}</p>
            {media.size && <p className="text-xs text-slate-400">{(media.size / 1024 / 1024).toFixed(2)} MB</p>}
          </div>
          <div className="flex items-center gap-2">
            <a
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-100 whitespace-nowrap"
              href={media.url}
              target="_blank"
              rel="noreferrer"
            >
              在新分頁開啟
            </a>
            <button
              className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-emerald-300 hover:to-cyan-300 whitespace-nowrap"
              type="button"
              onClick={onClose}
            >
              關閉
            </button>
          </div>
        </div>
        <div className="relative flex items-center justify-center bg-slate-950/60 p-4 sm:p-6">
          <div className="relative aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-black">
            {media.type === 'image' ? (
              <Image src={media.url} alt={media.key} fill loading="lazy" decoding="async" className="object-contain" sizes="100vw" />
            ) : (
              <video className="h-full w-full bg-black object-contain" src={media.url} controls autoPlay preload="metadata" playsInline />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
