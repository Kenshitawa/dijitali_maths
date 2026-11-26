import { env } from '../config/env.js';

function storageConfig() {
  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    throw new Error('Supabase Storage is not configured.');
  }

  return {
    baseUrl: env.supabaseUrl.replace(/\/+$/, ''),
    secretKey: env.supabaseSecretKey,
    bucket: env.supabaseStorageBucket,
  };
}

function encodeObjectPath(objectPath: string): string {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

export function isSupabaseStorageEnabled(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseSecretKey);
}

export function supabaseStoragePublicUrl(objectPath: string): string {
  const { baseUrl, bucket } = storageConfig();
  return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
}

export function supabaseStorageObjectPathFromUrl(value: string): string | null {
  try {
    const { baseUrl, bucket } = storageConfig();
    const url = new URL(value);
    if (url.origin !== baseUrl) return null;
    const pathname = url.pathname;
    const prefix = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`;
    if (!pathname.startsWith(prefix)) return null;
    return pathname
      .slice(prefix.length)
      .split('/')
      .map((part) => decodeURIComponent(part))
      .join('/');
  } catch {
    return null;
  }
}

export async function uploadSupabaseStorageObject(
  objectPath: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const { baseUrl, secretKey, bucket } = storageConfig();
  const response = await fetch(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`,
    {
      method: 'POST',
      headers: {
        apikey: secretKey,
        'Content-Type': contentType,
        'Cache-Control': 'max-age=31536000',
      },
      body: new Uint8Array(body),
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase Storage upload failed (${response.status}).`);
  }
}

export async function deleteSupabaseStorageObjects(objectPaths: string[]): Promise<void> {
  if (!objectPaths.length) return;

  const { baseUrl, secretKey, bucket } = storageConfig();
  const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: {
      apikey: secretKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: objectPaths }),
  });

  if (!response.ok) {
    throw new Error(`Supabase Storage delete failed (${response.status}).`);
  }
}
