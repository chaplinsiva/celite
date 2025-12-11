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

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const cmd = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  const res = await client.send(cmd);
  const body = res.Body;
  if (!body || !(body instanceof Readable)) {
    throw new Error('Unexpected R2 response body');
  }
  return streamToBuffer(body);
}


