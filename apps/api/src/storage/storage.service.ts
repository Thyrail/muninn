import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { API_ENV, type ApiEnv } from '../config/env.js';

export interface StoredObjectStream {
  body: Readable;
  contentLength: number | undefined;
  /** Set for range requests, e.g. `bytes 0-1023/52000`. */
  contentRange: string | undefined;
}

/** Thin wrapper around an S3-compatible bucket (SeaweedFS locally and in production). */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!(error instanceof S3ServiceException) || error.$metadata.httpStatusCode !== 404) {
        throw error;
      }
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created bucket ${this.bucket}`);
    }
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getBytes(key: string): Promise<Uint8Array> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) throw new Error(`Object ${key} has no body`);
    return response.Body.transformToByteArray();
  }

  /** Streams an object, optionally a byte range (`bytes=0-1023`) for seekable media. */
  async getStream(key: string, range?: string): Promise<StoredObjectStream> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: range }),
    );
    if (!response.Body) throw new Error(`Object ${key} has no body`);
    return {
      body: response.Body as Readable,
      contentLength: response.ContentLength,
      contentRange: response.ContentRange,
    };
  }

  /** Best effort: storage cleanup must never fail the user-facing delete. */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    } catch (error) {
      this.logger.warn(`Could not delete ${keys.length} object(s): ${String(error)}`);
    }
  }
}
