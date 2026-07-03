import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env, isS3Configured } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import type { StorageService, UploadParams, UploadResult } from './storage.service';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!isS3Configured()) {
    throw ApiError.badRequest(
      'Resume storage is not configured. Set AWS_S3_BUCKET and AWS credentials.'
    );
  }
  if (!client) {
    client = new S3Client({
      region: env.aws.region,
      credentials: {
        accessKeyId: env.aws.accessKeyId,
        secretAccessKey: env.aws.secretAccessKey,
      },
    });
  }
  return client;
}

function publicUrl(key: string): string {
  if (env.aws.s3PublicBaseUrl) {
    return `${env.aws.s3PublicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
  return `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
}

class S3Storage implements StorageService {
  async upload(params: UploadParams): Promise<UploadResult> {
    const ext = path.extname(params.filename) || '';
    const safeBase = path
      .basename(params.filename, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 60);
    const key = `${params.keyPrefix}/${crypto.randomUUID()}_${safeBase}${ext}`;

    await getClient().send(
      new PutObjectCommand({
        Bucket: env.aws.s3Bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
      })
    );

    return { key, url: publicUrl(key) };
  }
}

export const s3Storage: StorageService = new S3Storage();
