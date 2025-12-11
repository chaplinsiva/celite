import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_SOURCE_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

function ensureR2Config() {
  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 is not configured. Please set R2_ENDPOINT, R2_SOURCE_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY env vars.');
  }
}

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  ensureR2Config();
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID as string,
      secretAccessKey: R2_SECRET_ACCESS_KEY as string,
    },
  });
  return _client;
}

export async function uploadToR2(key: string, body: ArrayBuffer, contentType: string) {
  const client = getR2Client();
  const buffer = Buffer.from(body);
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });
  await client.send(cmd);
}

async function bodyToBuffer(body: any): Promise<Buffer> {
  // Already a Node Buffer
  if (Buffer.isBuffer(body)) {
    return body;
  }

  // Uint8Array / ArrayBuffer-like
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  // Node Readable stream
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // Generic async iterable (ReadableStream, etc.)
  if (body && typeof (body as any)[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<any>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // String
  if (typeof body === 'string') {
    return Buffer.from(body);
  }

  throw new Error('Unexpected R2 response body type');
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const cmd = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  const res = await client.send(cmd);
  const body = (res as any).Body;
  if (!body) {
    throw new Error('Empty R2 response body');
  }
  return bodyToBuffer(body);
}


