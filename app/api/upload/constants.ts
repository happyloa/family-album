export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

export function getSizeLimitByMime(type: string | undefined) {
  if (!type) return null;
  if (type.startsWith('image/')) return MAX_IMAGE_SIZE_BYTES;
  if (type.startsWith('video/')) return MAX_VIDEO_SIZE_BYTES;
  return null;
}
