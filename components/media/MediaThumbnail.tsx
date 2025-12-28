'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MediaFile } from './types';

function MediaBadge({ type }: { type: MediaFile['type'] }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-end text-xs font-semibold text-white">
      <span className="rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-100 ring-1 ring-slate-700">
        {type === 'image' ? '圖片' : '影片'}
      </span>
    </div>
  );
}

function VideoPreview({ src, alt, onReady }: { src: string; alt: string; onReady: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canPreview, setCanPreview] = useState(true);
  const hasNotifiedRef = useRef(false);

  const notifyReady = useCallback(() => {
    if (hasNotifiedRef.current) return;
    hasNotifiedRef.current = true;
    onReady();
  }, [onReady]);

  useEffect(() => {
    hasNotifiedRef.current = false;
    const video = videoRef.current;
    if (!video) return undefined;

    const startSilentPreview = async () => {
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = 'metadata';

      try {
        // iOS/Safari 需要觸發 play() 才會渲染第一幀，若失敗則改用備援畫面
        await video.play();
        setCanPreview(true);
        // 完成第一幀渲染後再交由 canplay 事件觸發 ready 通知
      } catch (error) {
        console.warn('Video preview fallback:', error);
        setCanPreview(false);
        notifyReady();
      }
    };

    startSilentPreview();
    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [src, notifyReady]);

  if (!canPreview) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-800/70 px-3 py-1 text-[11px] text-slate-200">行動裝置預覽</span>
          <p className="text-center text-slate-300">點擊後將載入影片</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      src={src}
      muted
      playsInline
      loop
      preload="metadata"
      aria-label={alt}
      onCanPlay={notifyReady}
      onLoadedData={notifyReady}
      onError={notifyReady}
    />
  );
}

export function MediaThumbnail({ media }: { media: MediaFile }) {
  const [loadedUrl, setLoadedUrl] = useState('');
  const isLoaded = loadedUrl === media.url;
  const handleReady = useCallback(() => setLoadedUrl(media.url), [media.url]);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-300/70 border-t-transparent"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
      {media.type === 'image' ? (
        <Image
          src={media.url}
          alt={media.key}
          fill
          className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          sizes="(min-width: 1280px) 25vw, 50vw"
          onLoadingComplete={handleReady}
          onError={handleReady}
        />
      ) : (
        <VideoPreview src={media.url} alt={media.key} onReady={handleReady} />
      )}
      <MediaBadge type={media.type} />
    </div>
  );
}
