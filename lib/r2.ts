import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const processEnv = typeof process !== 'undefined' ? process.env : undefined;

const env = {
  R2_ACCOUNT_ID: processEnv?.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: processEnv?.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: processEnv?.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: processEnv?.R2_BUCKET_NAME,
  R2_PUBLIC_BASE: processEnv?.R2_PUBLIC_BASE
} as const;

type EnvKeys = keyof typeof env;

type MediaItem = {
  key: string;
  url: string;
  type: 'image' | 'video';
  size?: number;
  lastModified?: string;
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

export async function listMedia(): Promise<MediaItem[]> {
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const client = getClient();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME
    })
  );

  if (!response.Contents) {
    return [];
  }

  return response.Contents.map((item) => {
    const key = item.Key ?? 'unknown';
    return {
      key,
      url: `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${encodeURIComponent(key)}`,
      type: inferType(key),
      size: item.Size,
      lastModified: item.LastModified?.toISOString()
    };
  });
}

export async function uploadToR2(file: File) {
  const { R2_BUCKET_NAME, R2_PUBLIC_BASE } = getEnv();
  const client = getClient();
  const key = `media/${Date.now()}-${file.name}`;
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
    key,
    url: `${R2_PUBLIC_BASE.replace(/\/$/, '')}/${encodeURIComponent(key)}`,
    type: inferType(key)
  } satisfies MediaItem;
}

function inferType(key: string): MediaItem['type'] {
  const lowered = key.toLowerCase();
  if (lowered.endsWith('.mp4') || lowered.endsWith('.mov') || lowered.endsWith('.webm')) {
    return 'video';
  }
  return 'image';
}
