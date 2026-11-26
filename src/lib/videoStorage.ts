import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { generateToken } from './crypto.js';
import {
  deleteSupabaseStorageObjects,
  isSupabaseStorageEnabled,
  supabaseStorageObjectPathFromUrl,
  supabaseStoragePublicUrl,
  uploadSupabaseStorageObject,
} from './supabaseStorage.js';

export type SupportedVideoMimeType = 'video/mp4' | 'video/webm';

export function detectVideoMime(buffer: Buffer): SupportedVideoMimeType | null {
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (/^(iso|mp4|M4V |avc1|dash|MSNV)/.test(brand)) return 'video/mp4';
  }
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'video/webm';
  }
  return null;
}

export async function saveVideo(buffer: Buffer): Promise<{ videoUrl: string; mimeType: SupportedVideoMimeType }> {
  const mimeType = detectVideoMime(buffer);
  if (!mimeType) throw new Error('Only valid MP4 and WebM video files can be uploaded.');

  const extension = mimeType === 'video/mp4' ? 'mp4' : 'webm';
  const filename = `${Date.now()}-${generateToken(8)}.${extension}`;
  if (isSupabaseStorageEnabled()) {
    const objectPath = `videos/${filename}`;
    await uploadSupabaseStorageObject(objectPath, buffer, mimeType);
    return { videoUrl: supabaseStoragePublicUrl(objectPath), mimeType };
  }

  const directory = path.resolve(env.uploadDir, 'videos');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer, { flag: 'wx' });
  return { videoUrl: `/uploads/videos/${filename}`, mimeType };
}

export async function deleteStoredVideo(videoUrl: string | null | undefined): Promise<void> {
  if (videoUrl && isSupabaseStorageEnabled()) {
    const objectPath = supabaseStorageObjectPathFromUrl(videoUrl);
    if (objectPath?.startsWith('videos/')) {
      await deleteSupabaseStorageObjects([objectPath]);
      return;
    }
  }

  if (!videoUrl?.startsWith('/uploads/videos/')) return;

  const filename = videoUrl.slice('/uploads/videos/'.length);
  if (!filename || path.basename(filename) !== filename) return;

  try {
    await unlink(path.resolve(env.uploadDir, 'videos', filename));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
}
