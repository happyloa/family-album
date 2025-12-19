const DEFAULT_MAX_SINGLE_SIZE_MB = 150;
const envMaxSingleSizeMb = Number(process.env.MAX_SINGLE_SIZE_MB ?? process.env.NEXT_PUBLIC_MAX_SINGLE_SIZE_MB);
export const MAX_SINGLE_SIZE_MB =
  Number.isFinite(envMaxSingleSizeMb) && envMaxSingleSizeMb > 0 ? envMaxSingleSizeMb : DEFAULT_MAX_SINGLE_SIZE_MB;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE_BYTES = MAX_SINGLE_SIZE_MB * 1024 * 1024;
export const MAX_TOTAL_SIZE_MB = 400;
export const MAX_FILE_COUNT = 20;

export function getSizeLimitByMime(type: string | undefined) {
  if (!type) return null;
  if (type.startsWith('image/')) return MAX_IMAGE_SIZE_BYTES;
  if (type.startsWith('video/')) return MAX_VIDEO_SIZE_BYTES;
  return null;
}
