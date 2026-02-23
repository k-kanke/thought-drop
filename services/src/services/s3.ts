import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

const DEFAULT_AWS_REGION = 'ap-northeast-1';
const DEFAULT_S3_PREFIX = 'uploads/';
const clientsByRegion = new Map<string, S3Client>();

function getEnv() {
  return {
    region: process.env.AWS_REGION ?? DEFAULT_AWS_REGION,
    bucket: process.env.S3_BUCKET,
    prefix: process.env.S3_PREFIX ?? DEFAULT_S3_PREFIX,
  };
}

function getClient(region: string): S3Client {
  const existing = clientsByRegion.get(region);
  if (existing) {
    return existing;
  }
  const created = new S3Client({ region });
  clientsByRegion.set(region, created);
  return created;
}

function normalizePrefix(prefix: string): string {
  if (!prefix) return '';
  return prefix.endsWith('/') ? prefix : `${prefix}/`;
}

function buildKey(filename: string, createdAtIso: string, memoId: number): string {
  const { prefix } = getEnv();
  const d = new Date(createdAtIso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const normalizedPrefix = normalizePrefix(prefix);
  return `${normalizedPrefix}${year}/${month}/memo_${memoId}/${filename}`;
}

function buildPublicObjectUrl(bucket: string, region: string, key: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export function isS3UploadEnabled(): boolean {
  return Boolean(getEnv().bucket);
}

export type UploadResult = {
  bucket: string;
  key: string;
  url: string;
};

export async function uploadLocalFileToS3(params: {
  absolutePath: string;
  filename: string;
  mimeType: string;
  memoId: number;
  createdAtIso: string;
}): Promise<UploadResult> {
  const { bucket, region } = getEnv();
  if (!bucket) {
    throw new Error('S3_BUCKET is not set');
  }

  const body = fs.readFileSync(params.absolutePath);
  const key = buildKey(params.filename, params.createdAtIso, params.memoId);

  await getClient(region).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: params.mimeType,
    }),
  );

  return {
    bucket,
    key,
    url: buildPublicObjectUrl(bucket, region, key),
  };
}

export async function createSignedObjectUrl(params: {
  bucket: string;
  key: string;
  expiresInSec?: number;
}): Promise<string> {
  const { region } = getEnv();
  const expiresInSec = params.expiresInSec ?? 300;
  return getSignedUrl(
    getClient(region),
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    }),
    { expiresIn: expiresInSec },
  );
}
