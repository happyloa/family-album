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

const env = {
  R2_ACCOUNT_ID: processEnv?.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: processEnv?.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: processEnv?.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: processEnv?.R2_BUCKET_NAME,
  R2_PUBLIC_BASE: processEnv?.R2_PUBLIC_BASE
} as const;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value'
});

let cachedClient: AwsClient | null = null;

function getEnv(): Record<EnvKeys, string> {
  const values: Partial<Record<EnvKeys, string>> = {};

  for (const [key, value] of Object.entries(env) as [EnvKeys, string | undefined][]) {
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    values[key] = value;
  }

  return values as Record<EnvKeys, string>;
}

function getClient() {
  if (cachedClient) return cachedClient;

  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = getEnv();

  cachedClient = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto'
  });

  return cachedClient;
}

function normalizePath(path: string) {
  return path.replace(/^\/+|\/+$/g, '').trim();
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
  const { R2_ACCOUNT_ID } = getEnv();
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return new URL(path, endpoint).toString();
}

function inferType(key: string): MediaFile['type'] {
  const lowered = key.toLowerCase();
  if (lowered.endsWith('.mp4') || lowered.endsWith('.mov') || lowered.endsWith('.webm')) {
    return 'video';
  }
  return 'image';
}

export async function listMedia(prefix = ''): Promise<MediaListing> {
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const normalizedPrefix = normalizePath(prefix);
  const searchPrefix = buildFolderKey(normalizedPrefix);

  const url = new URL(buildEndpointPath(`/${R2_BUCKET_NAME}`));
  url.searchParams.set('list-type', '2');
  url.searchParams.set('prefix', searchPrefix);
  url.searchParams.set('delimiter', '/');

  const response = await signedFetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to list objects: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml).ListBucketResult;

  const folders: FolderItem[] = ensureArray(parsed.CommonPrefixes).map((item: any) => {
    const prefixKey = readTextNode(item.Prefix);
    const relativeKey = prefixKey.replace(/\/$/, '');
    const name = relativeKey.split('/').pop() ?? relativeKey;
    return { key: relativeKey, name } as FolderItem;
  });

  const files: MediaFile[] = ensureArray(parsed.Contents).reduce<MediaFile[]>((acc, item: any) => {
    const key = readTextNode(item.Key);
    if (!key || key === searchPrefix) return acc;

    const sizeText = readTextNode(item.Size);
    const lastModified = readTextNode(item.LastModified) || undefined;

    acc.push({
      key,
      url: encodeKeyForUrl(key, R2_PUBLIC_BASE),
      type: inferType(key),
      size: sizeText ? Number(sizeText) : undefined,
      lastModified
    });

    return acc;
  }, []);

  return {
    prefix: normalizedPrefix,
    folders,
    files
  } satisfies MediaListing;
}

export async function uploadToR2(file: File, targetPrefix = '') {
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const normalizedPrefix = normalizePath(targetPrefix);
  const key = `${buildFolderKey(normalizedPrefix)}${Date.now()}-${file.name}`;
  const body = new Uint8Array(await file.arrayBuffer());

  const url = buildEndpointPath(`/${R2_BUCKET_NAME}/${key}`);
  const response = await signedFetch(url, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-amz-acl': 'private'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.status} ${response.statusText}`);
  }

  return {
    key,
    url: encodeKeyForUrl(key, R2_PUBLIC_BASE),
    type: inferType(key)
  } satisfies MediaFile;
}

export async function createFolder(prefix: string, name: string) {
  const { R2_BUCKET_NAME } = getEnv();
  const normalizedPrefix = normalizePath(prefix);
  const normalizedName = normalizePath(name);
  const folderPath = normalizedPrefix ? `${normalizedPrefix}/${normalizedName}` : normalizedName;
  const folderKey = `${buildFolderKey(folderPath)}`;

  const url = buildEndpointPath(`/${R2_BUCKET_NAME}/${folderKey}`);
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
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const normalizedKey = normalizePath(key);
  const parts = normalizedKey.split('/');
  const parent = parts.slice(0, -1).join('/');
  const newKey = parent ? `${parent}/${normalizePath(newName)}` : normalizePath(newName);

  const sourceKey = buildObjectKey(normalizedKey);
  const targetKey = buildObjectKey(newKey);

  const copyUrl = buildEndpointPath(`/${R2_BUCKET_NAME}/${targetKey}`);
  const copyResponse = await signedFetch(copyUrl, {
    method: 'PUT',
    headers: {
      'x-amz-copy-source': encodeCopySource(R2_BUCKET_NAME, sourceKey),
      'x-amz-acl': 'private'
    }
  });

  if (!copyResponse.ok) {
    throw new Error(`Failed to copy file: ${copyResponse.status} ${copyResponse.statusText}`);
  }

  const deleteUrl = buildEndpointPath(`/${R2_BUCKET_NAME}/${sourceKey}`);
  const deleteResponse = await signedFetch(deleteUrl, { method: 'DELETE' });
  if (!deleteResponse.ok && deleteResponse.status !== 404) {
    throw new Error(`Failed to delete old file: ${deleteResponse.status} ${deleteResponse.statusText}`);
  }

  return {
    key: newKey,
    url: encodeKeyForUrl(targetKey, R2_PUBLIC_BASE),
    type: inferType(targetKey)
  } satisfies MediaFile;
}

export async function renameFolder(key: string, newName: string) {
  const { R2_BUCKET_NAME } = getEnv();
  const normalizedKey = normalizePath(key);
  const parts = normalizedKey.split('/');
  const parent = parts.slice(0, -1).join('/');
  const newFolderPath = parent ? `${parent}/${normalizePath(newName)}` : normalizePath(newName);

  const sourcePrefix = buildFolderKey(normalizedKey);
  const targetPrefix = buildFolderKey(newFolderPath);

  let continuationToken: string | undefined;
  const toDelete: string[] = [];

  do {
    const listUrl = new URL(buildEndpointPath(`/${R2_BUCKET_NAME}`));
    listUrl.searchParams.set('list-type', '2');
    listUrl.searchParams.set('prefix', sourcePrefix);
    if (continuationToken) {
      listUrl.searchParams.set('continuation-token', continuationToken);
    }

    const listResponse = await signedFetch(listUrl.toString());
    if (!listResponse.ok) {
      throw new Error(`Failed to list folder for rename: ${listResponse.status} ${listResponse.statusText}`);
    }

    const xml = await listResponse.text();
    const parsed = xmlParser.parse(xml).ListBucketResult;

    for (const item of ensureArray(parsed.Contents)) {
      const sourceKey = readTextNode(item.Key);
      if (!sourceKey) continue;
      const targetKey = sourceKey.replace(sourcePrefix, targetPrefix);

      const copyUrl = buildEndpointPath(`/${R2_BUCKET_NAME}/${targetKey}`);
      const copyResponse = await signedFetch(copyUrl, {
        method: 'PUT',
        headers: {
          'x-amz-copy-source': encodeCopySource(R2_BUCKET_NAME, sourceKey),
          'x-amz-acl': 'private'
        }
      });

      if (!copyResponse.ok) {
        throw new Error(`Failed to copy object during folder rename: ${copyResponse.status} ${copyResponse.statusText}`);
      }

      toDelete.push(sourceKey);
    }

    const isTruncated = readTextNode(parsed.IsTruncated) === 'true';
    continuationToken = isTruncated ? readTextNode(parsed.NextContinuationToken) || undefined : undefined;
  } while (continuationToken);

  while (toDelete.length > 0) {
    const batch = toDelete.splice(0, 1000);
    const deleteUrl = buildEndpointPath(`/${R2_BUCKET_NAME}?delete`);
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
      throw new Error(`Failed to delete old folder objects: ${deleteResponse.status} ${deleteResponse.statusText}`);
    }
  }

  return { key: newFolderPath, name: newFolderPath.split('/').pop() || newFolderPath } satisfies FolderItem;
}
