'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';

import { MediaFile } from './types';

export function MediaPreviewModal({
  media,
  onClose,
  triggerElement
}: {
  media: MediaFile | null;
  onClose: () => void;
  triggerElement?: HTMLElement | null;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const mediaName = media?.key.split('/').pop() ?? '';
  const [loadedUrl, setLoadedUrl] = useState('');
  const isLoaded = media ? loadedUrl === media.url : false;
  const markLoaded = () => {
    if (media?.url) {
      setLoadedUrl(media.url);
    }
  };

  useEffect(() => {
    if (!media) return;

    const previouslyFocused = triggerElement ?? (document.activeElement as HTMLElement | null);
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey) {
        if (active === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [media, onClose, triggerElement]);

  if (!media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div
        className="relative max-h-[90vh] w-[min(1100px,92vw)] overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900/95 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white" id={titleId}>
              {mediaName}
            </p>
            {media.size ? <p className="text-xs text-slate-500">{(media.size / 1024 / 1024).toFixed(2)} MB</p> : null}
            <p className="sr-only" id={descriptionId}>
              {media.type === 'image' ? '圖片' : '影片'} 預覽{media.size ? `，大小 ${(media.size / 1024 / 1024).toFixed(2)} MB` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-all duration-200 hover:border-cyan-500/50 hover:text-cyan-100 whitespace-nowrap"
              href={media.url}
              target="_blank"
              rel="noreferrer"
            >
              在新分頁開啟
            </a>
            <button
              className="rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition-all duration-200 hover:from-cyan-400 hover:to-teal-400 cursor-pointer whitespace-nowrap"
              type="button"
              onClick={onClose}
              ref={closeButtonRef}
            >
              關閉
            </button>
          </div>
        </div>
        <div className="relative flex items-center justify-center bg-slate-950/80 p-4 sm:p-6">
          <div className="relative aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-black">
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
                <span
                  className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-400/60 border-t-transparent"
                  aria-hidden="true"
                />
              </div>
            )}
            {media.type === 'image' ? (
              <Image
                src={media.url}
                alt={media.key}
                fill
                loading="lazy"
                decoding="async"
                className={`object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                sizes="100vw"
                onLoadingComplete={markLoaded}
                onError={markLoaded}
              />
            ) : (
              <video
                className={`h-full w-full bg-black object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                src={media.url}
                controls
                autoPlay
                preload="metadata"
                playsInline
                onCanPlay={markLoaded}
                onLoadedData={markLoaded}
                onError={markLoaded}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
