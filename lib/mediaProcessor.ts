/* agent-notes: { ctx: "Real server-side image & video compression processor using sharp and ffmpeg", deps: ["sharp", "fluent-ffmpeg", "ffmpeg-static"], state: active, last: "sato@2026-07-28" } */

import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

// Configure ffmpeg binary path safely for Next.js App Router server environment
function getFFmpegPath(): string | null {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // 1. Try resolving via process.cwd() node_modules (handles Next.js App Router Webpack bundling)
  const isWin = process.platform === 'win32';
  const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
  const cwdPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', binaryName);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  // 2. Try require('ffmpeg-static') with \ROOT\ replacement
  try {
    const staticPath = require('ffmpeg-static');
    if (staticPath && typeof staticPath === 'string') {
      if (fs.existsSync(staticPath)) return staticPath;
      const fixedPath = staticPath.replace(/^\\ROOT\\/, process.cwd() + path.sep).replace(/^\/ROOT\//, process.cwd() + '/');
      if (fs.existsSync(fixedPath)) return fixedPath;
    }
  } catch (e) {}

  return null;
}

export interface ImageCompressionOptions {
  quality?: number; // 1-100 (default 80)
  maxWidth?: number; // default 1920
  format?: 'webp' | 'jpeg' | 'jpg' | 'png';
}

export interface VideoCompressionOptions {
  targetResolution?: '720p' | '1080p' | '480p';
  crf?: number; // 18-35 (lower = higher quality, default 26)
  maxBitrateKbps?: number; // e.g. 1500kbps
}

export interface CompressedMediaResult {
  buffer: Buffer;
  contentType: string;
  originalSize: number;
  compressedSize: number;
  format: string;
  width?: number;
  height?: number;
}

/**
 * Compress an image Buffer using sharp (converts PNG/JPEG/etc. to high-efficiency WebP)
 */
export async function compressImageBuffer(
  inputBuffer: Buffer,
  options: ImageCompressionOptions = {}
): Promise<CompressedMediaResult> {
  const quality = Math.max(10, Math.min(100, options.quality || 80));
  const maxWidth = options.maxWidth || 1920;
  const format = options.format || 'webp';

  let pipeline = sharp(inputBuffer).rotate(); // auto-rotate based on EXIF

  const metadata = await pipeline.metadata();
  const originalWidth = metadata.width || 1920;
  const originalHeight = metadata.height || 1080;

  // Downscale if width exceeds maxWidth
  if (originalWidth > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  let compressedBuffer: Buffer;
  let contentType: string;

  if (format === 'jpeg' || format === 'jpg') {
    compressedBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    contentType = 'image/jpeg';
  } else if (format === 'png') {
    compressedBuffer = await pipeline.png({ compressionLevel: 8, palette: true }).toBuffer();
    contentType = 'image/png';
  } else {
    // Default to WebP
    compressedBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
    contentType = 'image/webp';
  }

  const outMeta = await sharp(compressedBuffer).metadata();

  return {
    buffer: compressedBuffer,
    contentType,
    originalSize: inputBuffer.length,
    compressedSize: compressedBuffer.length,
    format,
    width: outMeta.width,
    height: outMeta.height,
  };
}

/**
 * Compress a video Buffer using FFmpeg (transcodes to optimized H.264 720p/1080p MP4)
 */
export async function compressVideoBuffer(
  inputBuffer: Buffer,
  options: VideoCompressionOptions = {}
): Promise<CompressedMediaResult> {
  const crf = options.crf ?? 26;
  const targetResolution = options.targetResolution || '720p';
  
  // Temporary file paths for FFmpeg processing
  const tempDir = os.tmpdir();
  const inputTempPath = path.join(tempDir, `input-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.mp4`);
  const outputTempPath = path.join(tempDir, `output-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.mp4`);

  try {
    // Write input buffer to temporary file
    await fs.promises.writeFile(inputTempPath, inputBuffer);

    const ffmpeg = require('fluent-ffmpeg');
    const binaryPath = getFFmpegPath();
    if (binaryPath) {
      ffmpeg.setFfmpegPath(binaryPath);
    }

    // Determine scale filter
    let scaleFilter = 'scale=-2:720';
    if (targetResolution === '1080p') {
      scaleFilter = 'scale=-2:1080';
    } else if (targetResolution === '480p') {
      scaleFilter = 'scale=-2:480';
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputTempPath)
        .outputOptions([
          '-c:v libx264',
          `-crf ${crf}`,
          '-preset fast',
          `-vf ${scaleFilter}`,
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart', // Fast web streaming start
          '-pix_fmt yuv420p'     // Maximum browser player compatibility
        ])
        .output(outputTempPath)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .run();
    });

    const compressedBuffer = await fs.promises.readFile(outputTempPath);

    return {
      buffer: compressedBuffer,
      contentType: 'video/mp4',
      originalSize: inputBuffer.length,
      compressedSize: compressedBuffer.length,
      format: 'mp4',
    };
  } finally {
    // Cleanup temporary files
    try { if (fs.existsSync(inputTempPath)) await fs.promises.unlink(inputTempPath); } catch (e) {}
    try { if (fs.existsSync(outputTempPath)) await fs.promises.unlink(outputTempPath); } catch (e) {}
  }
}
