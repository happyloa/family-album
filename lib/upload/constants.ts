const DEFAULT_MAX_IMAGE_SIZE_MB = 10;
const DEFAULT_MAX_VIDEO_SIZE_MB = 150;

const envMaxImageSizeMb = Number(process.env.MAX_IMAGE_SIZE_MB ?? process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE_MB);
const envMaxVideoSizeMb = Number(
  process.env.MAX_VIDEO_SIZE_MB ??
    process.env.MAX_SINGLE_SIZE_MB ??
    process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB ??
    process.env.NEXT_PUBLIC_MAX_SINGLE_SIZE_MB
);

export const MAX_IMAGE_SIZE_MB =
  Number.isFinite(envMaxImageSizeMb) && envMaxImageSizeMb > 0 ? envMaxImageSizeMb : DEFAULT_MAX_IMAGE_SIZE_MB;
export const MAX_VIDEO_SIZE_MB =
  Number.isFinite(envMaxVideoSizeMb) && envMaxVideoSizeMb > 0 ? envMaxVideoSizeMb : DEFAULT_MAX_VIDEO_SIZE_MB;

export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export function getSizeLimitByMime(type: string | undefined) {
  if (!type) return null;
  if (type.startsWith('image/')) return MAX_IMAGE_SIZE_BYTES;
  if (type.startsWith('video/')) return MAX_VIDEO_SIZE_BYTES;
  return null;
}
