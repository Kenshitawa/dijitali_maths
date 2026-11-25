import { describe, expect, it } from 'vitest';
import { hashPassword, hashVisitorDaily, verifyPassword } from '../src/lib/crypto.js';
import { escapeCsvCell, sanitizePlainText, sanitizeRichText } from '../src/lib/sanitize.js';
import { detectImageMime } from '../src/lib/storage.js';
import { detectVideoMime } from '../src/lib/videoStorage.js';
import { normalizeKenyanPhoneNumber } from '../src/lib/mpesa.js';

describe('Image magic-byte detection', () => {
  it('detects JPEG magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectImageMime(buf)).toBe('image/jpeg');
  });

  describe('Video validation and M-Pesa phone normalization', () => {
    it('accepts MP4 and WebM signatures but rejects disguised files', () => {
      const mp4 = Buffer.alloc(16);
      mp4.write('ftyp', 4);
      mp4.write('isom', 8);
      expect(detectVideoMime(mp4)).toBe('video/mp4');
      expect(detectVideoMime(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))).toBe('video/webm');
      expect(detectVideoMime(Buffer.from('not a video'))).toBeNull();
    });

    it('normalizes Kenya mobile numbers and rejects unsupported formats', () => {
      expect(normalizeKenyanPhoneNumber('0712 345 678')).toBe('254712345678');
      expect(normalizeKenyanPhoneNumber('+254 112 345 678')).toBe('254112345678');
      expect(normalizeKenyanPhoneNumber('12345')).toBeNull();
    });
  });

  it('detects PNG magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(detectImageMime(buf)).toBe('image/png');
  });

  it('detects WebP magic bytes', () => {
    const buf = Buffer.from('RIFF\x00\x00\x00\x00WEBP', 'binary');
    expect(detectImageMime(buf)).toBe('image/webp');
  });

  it('rejects disguised non-image buffers', () => {
    const buf = Buffer.from('<html><script>alert(1)</script></html>');
    expect(detectImageMime(buf)).toBeNull();
  });
});

describe('Sanitization & CSV escaping', () => {
  it('strips dangerous scripts from rich text', () => {
    const dirty = '<p>Hello</p><script>alert(1)</script><img src="x" onerror="alert(2)">';
    const clean = sanitizeRichText(dirty);
    expect(clean).toContain('<p>Hello</p>');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
  });

  it('strips all HTML from plain text', () => {
    expect(sanitizePlainText('<b>Brenda</b>')).toBe('Brenda');
  });

  it('prevents CSV formula injection', () => {
    expect(escapeCsvCell('=CMD("calc")')).toBe('"\'=CMD(""calc"")"');
    expect(escapeCsvCell('Normal, Text')).toBe('"Normal, Text"');
  });
});

describe('Crypto & privacy hashing', () => {
  it('hashes and verifies passwords with bcrypt', async () => {
    const hash = await hashPassword('SuperSecurePassword123!');
    expect(await verifyPassword('SuperSecurePassword123!', hash)).toBe(true);
    expect(await verifyPassword('WrongPassword123!', hash)).toBe(false);
  });

  it('hashes visitor IP + UA with daily salt and rotates across days', () => {
    const h1 = hashVisitorDaily('192.0.2.10', 'Mozilla/5.0', '2026-11-24');
    const h2 = hashVisitorDaily('192.0.2.10', 'Mozilla/5.0', '2026-11-24');
    const h3 = hashVisitorDaily('192.0.2.10', 'Mozilla/5.0', '2026-11-25');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toContain('192.0.2.10');
  });
});
