import { AwsClient } from 'aws4fetch';
import { XMLParser } from 'fast-xml-parser';

type EnvKeys =
  | 'R2_ACCOUNT_ID'
  | 'R2_ACCESS_KEY_ID'
  | 'R2_SECRET_ACCESS_KEY'
  | 'R2_BUCKET_NAME'
  | 'R2_PUBLIC_BASE';

type MediaFile = {
  key: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
  lastModified?: string;
};

type FolderItem = {
  key: string;
  name: string;
};

export type MediaListing = {
  prefix: string;
  folders: FolderItem[];
  files: MediaFile[];
};

const processEnv = typeof process !== 'undefined' ? process.env : undefined;

function loadEnv(): Record<EnvKeys, string> {
  const entries: Partial<Record<EnvKeys, string>> = {
    R2_ACCOUNT_ID: processEnv?.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: processEnv?.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: processEnv?.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: processEnv?.R2_BUCKET_NAME,
    R2_PUBLIC_BASE: processEnv?.R2_PUBLIC_BASE
  };

  for (const [key, value] of Object.entries(entries) as [EnvKeys, string | undefined][]) {
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
  }

  return entries as Record<EnvKeys, string>;
}

const env = loadEnv();

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value'
});

let cachedClient: AwsClient | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  cachedClient = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto'
  });

  return cachedClient;
}

function normalizePath(path: string) {
  return path.replace(/^\/+|\/+$/g, '').trim();
}

function sanitizeSegment(name: string) {
  return normalizePath(name).replace(/[<>:"/\\|?*]+/g, '');
}

function sanitizePath(path: string) {
  return path
    .split('/')
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join('/');
}

function buildObjectKey(path: string) {
  return normalizePath(path);
}

function buildFolderKey(path: string) {
  const normalized = normalizePath(path);
  return normalized ? `${normalized}/` : '';
}

function encodeKeyForUrl(key: string, base: string) {
  const url = new URL(base);
  const decodedBasePath = decodeURI(url.pathname || '/').replace(/\/+$/, '');

  const encodedKey = key
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  url.pathname = [decodedBasePath, encodedKey].filter(Boolean).join('/');
  return url.toString();
}

function encodeCopySource(bucket: string, key: string) {
  return `/${bucket}/${key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readTextNode(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const text = (value as { value?: unknown }).value;
    if (text === undefined || text === null) return '';
    return String(text);
  }
  return '';
}

async function signedFetch(input: string, init?: RequestInit) {
  const client = getClient();
  return client.fetch(input, init);
}

function buildEndpointPath(path: string) {
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return new URL(path, endpoint).toString();
}

function buildListUrl(prefix: string, options: { continuationToken?: string; delimiter?: string } = {}) {
  const url = new URL(buildEndpointPath(`/${env.R2_BUCKET_NAME}`));
  url.searchParams.set('list-type', '2');
  url.searchParams.set('prefix', prefix);
  if (options.delimiter) {
    url.searchParams.set('delimiter', options.delimiter);
  }
  if (options.continuationToken) {
    url.searchParams.set('continuation-token', options.continuationToken);
  }
  return url;
}

function inferType(key: string): MediaFile['type'] {
  const lowered = key.toLowerCase();
  if (lowered.endsWith('.mp4') || lowered.endsWith('.mov') || lowered.endsWith('.webm')) {
    return 'video';
  }
  return 'image';
}

type ParsedListResult = {
  folders: FolderItem[];
  contents: { key: string; size?: number; lastModified?: string }[];
  isTruncated: boolean;
  nextContinuationToken?: string;
};

function parseListResult(xml: string, searchPrefix: string, includeFolders: boolean): ParsedListResult {
  const parsed = xmlParser.parse(xml).ListBucketResult;

  const folders: FolderItem[] = includeFolders
    ? ensureArray(parsed.CommonPrefixes).map((item: any) => {
        const prefixKey = readTextNode(item.Prefix);
        const relativeKey = prefixKey.replace(/\/$/, '');
        const name = relativeKey.split('/').pop() ?? relativeKey;
        return { key: relativeKey, name } as FolderItem;
      })
    : [];

  const contents = ensureArray(parsed.Contents)
    .map((item: any) => {
      const key = readTextNode(item.Key);
      if (!key || key === searchPrefix) return null;

      const sizeText = readTextNode(item.Size);
      const lastModified = readTextNode(item.LastModified) || undefined;

      return {
        key,
        size: sizeText ? Number(sizeText) : undefined,
        lastModified
      };
    })
    .filter((item): item is { key: string; size?: number; lastModified?: string } => Boolean(item));

  const isTruncated = readTextNode(parsed.IsTruncated) === 'true';
  const nextContinuationToken = isTruncated ? readTextNode(parsed.NextContinuationToken) || undefined : undefined;

  return { folders, contents, isTruncated, nextContinuationToken };
}

async function collectKeys(prefix: string) {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  const searchPrefix = buildFolderKey(prefix);

  do {
    const url = buildListUrl(searchPrefix, { continuationToken });
    const response = await signedFetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to list folder for processing: ${response.status} ${response.statusText}`);
    }

    const { contents, nextContinuationToken } = parseListResult(await response.text(), searchPrefix, false);
    keys.push(...contents.map((item) => item.key));
    continuationToken = nextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function deleteObjects(keys: string[]) {
  while (keys.length > 0) {
    const batch = keys.splice(0, 1000);
    const deleteUrl = buildEndpointPath(`/${env.R2_BUCKET_NAME}?delete`);
    const deleteBody = `<Delete>${batch
      .map((key) => `<Object><Key>${escapeXml(key)}</Key></Object>`)
      .join('')}</Delete>`;

    const deleteResponse = await signedFetch(deleteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: deleteBody
    });

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete objects: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }
  }
}

async function copyObjectWithinBucket(sourceKey: string, targetKey: string) {
  const copyUrl = buildEndpointPath(`/${env.R2_BUCKET_NAME}/${targetKey}`);
  const copyResponse = await signedFetch(copyUrl, {
    method: 'PUT',
    headers: {
      'x-amz-copy-source': encodeCopySource(env.R2_BUCKET_NAME, sourceKey),
      'x-amz-acl': 'private'
    }
  });

  if (!copyResponse.ok) {
    throw new Error(`Failed to copy object: ${copyResponse.status} ${copyResponse.statusText}`);
  }
}

export async function listMedia(prefix = ''): Promise<MediaListing> {
  const normalizedPrefix = sanitizePath(prefix);
  const searchPrefix = buildFolderKey(normalizedPrefix);

  const response = await signedFetch(buildListUrl(searchPrefix, { delimiter: '/' }).toString());
  if (!response.ok) {
    throw new Error(`Failed to list objects: ${response.status} ${response.statusText}`);
  }

  const { folders, contents } = parseListResult(await response.text(), searchPrefix, true);

  const files: MediaFile[] = contents.map((item) => ({
    key: item.key,
    url: encodeKeyForUrl(item.key, env.R2_PUBLIC_BASE),
    type: inferType(item.key),
    size: item.size,
    lastModified: item.lastModified
  }));

  return {
    prefix: normalizedPrefix,
    folders,
    files
  } satisfies MediaListing;
}

export async function uploadToR2(file: File, targetPrefix = '') {
  const normalizedPrefix = sanitizePath(targetPrefix);
  const key = `${buildFolderKey(normalizedPrefix)}${Date.now()}-${file.name}`;
  const body = new Uint8Array(await file.arrayBuffer());

  const url = buildEndpointPath(`/${env.R2_BUCKET_NAME}/${key}`);
  const response = await signedFetch(url, {
    method: 'PUT',
    body,
    headers: {
      // 儲存時帶上檔案類型，讓 R2 與 CDN 能正確推斷 Content-Type
      'Content-Type': file.type || 'application/octet-stream',
      'x-amz-acl': 'private'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.status} ${response.statusText}`);
  }

  return {
    key,
    url: encodeKeyForUrl(key, env.R2_PUBLIC_BASE),
    type: inferType(key)
  } satisfies MediaFile;
}

export async function createFolder(prefix: string, name: string) {
  const normalizedPrefix = sanitizePath(prefix);
  const normalizedName = sanitizeSegment(name);
  const folderPath = normalizedPrefix ? `${normalizedPrefix}/${normalizedName}` : normalizedName;
  const folderKey = `${buildFolderKey(folderPath)}`;

  const url = buildEndpointPath(`/${env.R2_BUCKET_NAME}/${folderKey}`);
  const response = await signedFetch(url, {
    method: 'PUT',
    body: new Uint8Array(),
    headers: {
      'x-amz-acl': 'private'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to create folder: ${response.status} ${response.statusText}`);
  }

  return { key: folderPath, name: normalizedName } satisfies FolderItem;
}

export async function renameFile(key: string, newName: string) {
  const normalizedKey = normalizePath(key);
  const parts = normalizedKey.split('/');
  const parent = parts.slice(0, -1).join('/');
  const newKey = parent ? `${sanitizePath(parent)}/${sanitizeSegment(newName)}` : sanitizeSegment(newName);

  const sourceKey = buildObjectKey(normalizedKey);
  const targetKey = buildObjectKey(newKey);

  await copyObjectWithinBucket(sourceKey, targetKey);

  const deleteUrl = buildEndpointPath(`/${env.R2_BUCKET_NAME}/${sourceKey}`);
  const deleteResponse = await signedFetch(deleteUrl, { method: 'DELETE' });
  if (!deleteResponse.ok && deleteResponse.status !== 404) {
    throw new Error(`Failed to delete old file: ${deleteResponse.status} ${deleteResponse.statusText}`);
  }

  return {
    key: newKey,
    url: encodeKeyForUrl(targetKey, env.R2_PUBLIC_BASE),
    type: inferType(targetKey)
  } satisfies MediaFile;
}

export async function renameFolder(key: string, newName: string) {
  const normalizedKey = normalizePath(key);
  const parts = normalizedKey.split('/');
  const parent = parts.slice(0, -1).join('/');
  const newFolderPath = parent ? `${sanitizePath(parent)}/${sanitizeSegment(newName)}` : sanitizeSegment(newName);

  const sourcePrefix = buildFolderKey(normalizedKey);
  const targetPrefix = buildFolderKey(newFolderPath);

  const keys = await collectKeys(normalizedKey);

  for (const sourceKey of keys) {
    const targetKey = sourceKey.replace(sourcePrefix, targetPrefix);
    await copyObjectWithinBucket(sourceKey, targetKey);
  }

  await deleteObjects(keys);

  return { key: newFolderPath, name: newFolderPath.split('/').pop() || newFolderPath } satisfies FolderItem;
}

export async function deleteFile(key: string) {
  const normalizedKey = normalizePath(key);
  const deleteUrl = buildEndpointPath(`/${env.R2_BUCKET_NAME}/${normalizedKey}`);
  const deleteResponse = await signedFetch(deleteUrl, { method: 'DELETE' });

  if (!deleteResponse.ok && deleteResponse.status !== 404) {
    throw new Error(`Failed to delete file: ${deleteResponse.status} ${deleteResponse.statusText}`);
  }
}

export async function deleteFolder(prefix: string) {
  const normalizedPrefix = sanitizePath(prefix);
  const targetPrefix = buildFolderKey(normalizedPrefix);

  const keys = await collectKeys(targetPrefix);
  if (keys.length === 0) return;

  await deleteObjects(keys);
}

export async function moveFile(key: string, targetPrefix: string) {
  const normalizedKey = normalizePath(key);
  const filename = normalizedKey.split('/').pop();
  if (!filename) throw new Error('Invalid file name');

  const safeTargetPrefix = sanitizePath(targetPrefix);
  const newKey = safeTargetPrefix ? `${safeTargetPrefix}/${filename}` : filename;

  await copyObjectWithinBucket(normalizedKey, newKey);

  const deleteUrl = buildEndpointPath(`/${env.R2_BUCKET_NAME}/${normalizedKey}`);
  const deleteResponse = await signedFetch(deleteUrl, { method: 'DELETE' });
  if (!deleteResponse.ok && deleteResponse.status !== 404) {
    throw new Error(`Failed to delete old file after move: ${deleteResponse.status} ${deleteResponse.statusText}`);
  }

  return { key: newKey, url: encodeKeyForUrl(newKey, env.R2_PUBLIC_BASE), type: inferType(newKey) } satisfies MediaFile;
}

export async function moveFolder(key: string, targetPrefix: string) {
  const normalizedKey = normalizePath(key);
  const folderName = normalizedKey.split('/').pop();
  if (!folderName) throw new Error('Invalid folder');

  const safeTargetPrefix = sanitizePath(targetPrefix);
  const targetFolderPath = safeTargetPrefix ? `${safeTargetPrefix}/${folderName}` : folderName;

  const sourcePrefix = buildFolderKey(normalizedKey);
  const targetPrefixKey = buildFolderKey(targetFolderPath);

  const keys = await collectKeys(normalizedKey);

  for (const sourceKey of keys) {
    const targetKey = sourceKey.replace(sourcePrefix, targetPrefixKey);
    await copyObjectWithinBucket(sourceKey, targetKey);
  }

  await deleteObjects(keys);

  return { key: targetFolderPath, name: targetFolderPath.split('/').pop() || targetFolderPath } satisfies FolderItem;
}
