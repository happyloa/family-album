export const sanitizeName = (value: string) => value.replace(/[<>:"/\\|?*]+/g, '').trim();

export const sanitizePath = (value: string) =>
  value
    .split('/')
    .map((segment) => sanitizeName(segment))
    .filter(Boolean)
    .join('/');

export const getDepth = (path: string) => (path ? path.split('/').filter(Boolean).length : 0);
