import { createHash } from 'crypto';

const ALLOWED_EXTENSIONS = ['.json', '.zip'];
const MAX_SIZE_BYTES = Number(process.env.SOARFORGE_BUNDLE_MAX_MB || 10) * 1024 * 1024;

export function validateBundleFileMetadata(input: { fileName: string; size: number; contentType?: string | null }) {
  const fileName = input.fileName.trim();
  const lower = fileName.toLowerCase();

  if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, reason: 'Invalid file name.' };
  }

  if (lower.endsWith('.json.exe') || lower.endsWith('.zip.exe') || lower.split('.').length > 3) {
    return { valid: false, reason: 'Double extensions are not allowed.' };
  }

  if (!ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return { valid: false, reason: 'Only .json and .zip offline bundles are allowed.' };
  }

  if (input.size <= 0 || input.size > MAX_SIZE_BYTES) {
    return { valid: false, reason: `File must be between 1 byte and ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)}MB.` };
  }

  return { valid: true, reason: 'ok' };
}

export function validateBundleMagicBytes(fileName: string, buffer: Buffer) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.zip')) {
    const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2]);
    return { valid: isZip, reason: isZip ? 'zip_magic_ok' : 'ZIP file signature mismatch.' };
  }

  if (lower.endsWith('.json')) {
    const start = buffer.toString('utf8', 0, Math.min(buffer.length, 64)).trimStart()[0];
    const isJson = start === '{' || start === '[';
    return { valid: isJson, reason: isJson ? 'json_magic_ok' : 'JSON file does not start with an object or array.' };
  }

  return { valid: false, reason: 'Unsupported file type.' };
}

export function sha256Buffer(input: Buffer | ArrayBuffer) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : Buffer.from(new Uint8Array(input));

  return createHash('sha256').update(buffer).digest('hex');
}
