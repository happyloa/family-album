import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';

const processEnv = typeof process !== 'undefined' ? process.env : undefined;

const env = {
  R2_ACCOUNT_ID: processEnv?.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: processEnv?.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: processEnv?.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: processEnv?.R2_BUCKET_NAME,
  R2_PUBLIC_BASE: processEnv?.R2_PUBLIC_BASE
} as const;

type EnvKeys = keyof typeof env;

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
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = getEnv();

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });
}

function normalizePath(path: string) {
  return path.replace(/^\/+|\/+$/g, '').trim();
}

function buildObjectKey(path: string) {
  const normalized = normalizePath(path);
  return normalized ? `media/${normalized}` : 'media';
}

function buildFolderKey(path: string) {
  const normalized = normalizePath(path);
  const withTrailing = normalized ? `${normalized}/` : '';
  return `media/${withTrailing}`;
}

function encodeKeyForUrl(key: string, base: string) {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base.replace(/\/$/, '')}/${encodedKey}`;
}

function encodeCopySource(bucket: string, key: string) {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/${bucket}/${encodedKey}`;
}

export async function listMedia(prefix = ''): Promise<MediaListing> {
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const client = getClient();
  const normalizedPrefix = normalizePath(prefix);
  const searchPrefix = buildFolderKey(normalizedPrefix);

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: searchPrefix,
      Delimiter: '/'
    })
  );

  const folders: FolderItem[] = (response.CommonPrefixes || []).map((item) => {
    const prefixKey = item.Prefix ?? '';
    const relativeKey = prefixKey.replace(/^media\//, '').replace(/\/$/, '');
    const name = relativeKey.split('/').pop() ?? relativeKey;
    return { key: relativeKey, name };
  });

  const files: MediaFile[] = (response.Contents || [])
    .filter((item) => item.Key && item.Key !== searchPrefix)
    .map((item) => {
      const key = item.Key ?? 'unknown';
      const relativeKey = key.replace(/^media\//, '');
      return {
        key: relativeKey,
        url: encodeKeyForUrl(key, R2_PUBLIC_BASE),
        type: inferType(key),
        size: item.Size,
        lastModified: item.LastModified?.toISOString()
      };
    });

  return {
    prefix: normalizedPrefix,
    folders,
    files
  } satisfies MediaListing;
}

export async function uploadToR2(file: File, targetPrefix = '') {
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const client = getClient();
  const normalizedPrefix = normalizePath(targetPrefix);
  const key = `${buildFolderKey(normalizedPrefix)}${Date.now()}-${file.name}`;
  const body = new Uint8Array(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: file.type || undefined,
      ACL: 'private'
    })
  );

  return {
    key: key.replace(/^media\//, ''),
    url: encodeKeyForUrl(key, R2_PUBLIC_BASE),
    type: inferType(key)
  } satisfies MediaFile;
}

export async function createFolder(prefix: string, name: string) {
  const { R2_BUCKET_NAME } = getEnv();
  const client = getClient();
  const normalizedPrefix = normalizePath(prefix);
  const normalizedName = normalizePath(name);
  const folderPath = normalizedPrefix ? `${normalizedPrefix}/${normalizedName}` : normalizedName;
  const folderKey = `${buildFolderKey(folderPath)}`;

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: folderKey,
      Body: new Uint8Array(),
      ACL: 'private'
    })
  );

  return { key: folderPath, name: normalizedName } satisfies FolderItem;
}

export async function renameFile(key: string, newName: string) {
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const client = getClient();
  const normalizedKey = normalizePath(key);
  const parts = normalizedKey.split('/');
  const parent = parts.slice(0, -1).join('/');
  const newKey = parent ? `${parent}/${normalizePath(newName)}` : normalizePath(newName);

  const sourceKey = buildObjectKey(normalizedKey);
  const targetKey = buildObjectKey(newKey);

  await client.send(
    new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME,
      CopySource: encodeCopySource(R2_BUCKET_NAME, sourceKey),
      Key: targetKey,
      ACL: 'private'
    })
  );

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sourceKey
    })
  );

  return {
    key: newKey,
    url: encodeKeyForUrl(targetKey, R2_PUBLIC_BASE),
    type: inferType(targetKey)
  } satisfies MediaFile;
}

export async function renameFolder(key: string, newName: string) {
  const { R2_BUCKET_NAME } = getEnv();
  const client = getClient();
  const normalizedKey = normalizePath(key);
  const parts = normalizedKey.split('/');
  const parent = parts.slice(0, -1).join('/');
  const newFolderPath = parent ? `${parent}/${normalizePath(newName)}` : normalizePath(newName);

  const sourcePrefix = buildFolderKey(normalizedKey);
  const targetPrefix = buildFolderKey(newFolderPath);

  let continuationToken: string | undefined;
  const toDelete: { Key: string }[] = [];

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: sourcePrefix,
        ContinuationToken: continuationToken
      })
    );

    for (const item of listResponse.Contents || []) {
      if (!item.Key) continue;
      const targetKey = item.Key.replace(sourcePrefix, targetPrefix);
      await client.send(
        new CopyObjectCommand({
          Bucket: R2_BUCKET_NAME,
          CopySource: encodeCopySource(R2_BUCKET_NAME, item.Key),
          Key: targetKey,
          ACL: 'private'
        })
      );
      toDelete.push({ Key: item.Key });
    }

    continuationToken = listResponse.IsTruncated ? listResponse.NextContinuationToken : undefined;
  } while (continuationToken);

  while (toDelete.length > 0) {
    const batch = toDelete.splice(0, 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: batch }
      })
    );
  }

  return { key: newFolderPath, name: newFolderPath.split('/').pop() || newFolderPath } satisfies FolderItem;
}

function inferType(key: string): MediaFile['type'] {
  const lowered = key.toLowerCase();
  if (lowered.endsWith('.mp4') || lowered.endsWith('.mov') || lowered.endsWith('.webm')) {
    return 'video';
  }
  return 'image';
}
