import path from 'path';

export function validateArchiveEntryPath(entryName: string, targetDir = '/tmp/soarforge-bundle') {
  if (!entryName || entryName.includes('\0')) return false;
  const resolvedTarget = path.resolve(targetDir) + path.sep;
  const resolvedEntry = path.resolve(targetDir, entryName);
  return resolvedEntry.startsWith(resolvedTarget);
}
