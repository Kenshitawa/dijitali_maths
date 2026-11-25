import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { generateToken } from './crypto.js';

export type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface StoredImageResult {
  originalUrl: string;
  webUrl: string;
  webSmallUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: AllowedImageMime;
}

export interface StorageAdapter {
  saveImage(buffer: Buffer, originalName: string): Promise<StoredImageResult>;
  deleteImageByUrls(urls: string[]): Promise<void>;
}

/**
 * Inspect magic bytes to verify actual image format (never trust file extensions).
 */
export function detectImageMime(buffer: Buffer): AllowedImageMime | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function extForMime(mime: AllowedImageMime): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return 'webp';
}

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir = env.uploadDir) {
    this.baseDir = path.resolve(baseDir);
  }

  private async ensureDirs() {
    await fs.mkdir(path.join(this.baseDir, 'originals'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'web'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'small'), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'thumbs'), { recursive: true });
  }

  async saveImage(buffer: Buffer, originalName: string): Promise<StoredImageResult> {
    const mime = detectImageMime(buffer);
    if (!mime) {
      throw new Error(
        `Rejected "${originalName}": unsupported file format. Only JPEG, PNG, and WebP images are allowed.`
      );
    }

    await this.ensureDirs();

    const id = `${Date.now()}-${generateToken(6)}`;
    const origExt = extForMime(mime);

    // Strip EXIF/GPS metadata on all saved versions (including original) by re-encoding
    const baseSharp = sharp(buffer, { failOn: 'error' }).rotate();
    const meta = await baseSharp.metadata();
    const width = meta.width || 1200;
    const height = meta.height || 800;

    // 1. Metadata-stripped original
    const origFilename = `${id}.${origExt}`;
    const origPath = path.join(this.baseDir, 'originals', origFilename);
    let origPipeline = sharp(buffer).rotate();
    if (mime === 'image/jpeg') origPipeline = origPipeline.jpeg({ quality: 92 });
    else if (mime === 'image/png') origPipeline = origPipeline.png({ compressionLevel: 9 });
    else origPipeline = origPipeline.webp({ quality: 92 });
    await origPipeline.toFile(origPath);

    // 2. Web optimized (max 1600px wide)
    const webFilename = `${id}.webp`;
    const webPath = path.join(this.baseDir, 'web', webFilename);
    await sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(webPath);

    // 3. Web small (max 800px wide for srcset)
    const smallPath = path.join(this.baseDir, 'small', webFilename);
    await sharp(buffer)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(smallPath);

    // 4. Thumbnail (max 400px wide)
    const thumbPath = path.join(this.baseDir, 'thumbs', webFilename);
    await sharp(buffer)
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 76 })
      .toFile(thumbPath);

    const webStat = await fs.stat(webPath);

    return {
      originalUrl: `/uploads/originals/${origFilename}`,
      webUrl: `/uploads/web/${webFilename}`,
      webSmallUrl: `/uploads/small/${webFilename}`,
      thumbUrl: `/uploads/thumbs/${webFilename}`,
      width,
      height,
      sizeBytes: webStat.size,
      mimeType: mime,
    };
  }

  async deleteImageByUrls(urls: string[]): Promise<void> {
    for (const url of urls) {
      if (!url || !url.startsWith('/uploads/')) continue;
      const rel = url.replace(/^\/uploads\//, '');
      const full = path.resolve(this.baseDir, rel);
      // Prevent path traversal
      if (!full.startsWith(this.baseDir)) continue;
      await fs.unlink(full).catch(() => {});
    }
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();
