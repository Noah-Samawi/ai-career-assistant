import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";
import { decryptBuffer, encryptBuffer, randomToken } from "./crypto";

/**
 * Encrypted local file storage. Swap for S3/GCS in production (Phase 5) –
 * the interface (put/get/remove by opaque key) stays the same.
 */
function root(): string {
  return path.resolve(env().STORAGE_DIR);
}

function resolveKey(key: string): string {
  if (!/^[a-zA-Z0-9/_-]+$/.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return path.join(root(), key);
}

export async function putEncrypted(prefix: string, data: Buffer): Promise<string> {
  const key = `${prefix}/${randomToken(18)}`;
  const file = resolveKey(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, encryptBuffer(data, env().FILE_ENCRYPTION_KEY), { mode: 0o600 });
  return key;
}

export async function getDecrypted(key: string): Promise<Buffer> {
  return decryptBuffer(await readFile(resolveKey(key)), env().FILE_ENCRYPTION_KEY);
}

export async function removeObject(key: string): Promise<void> {
  await rm(resolveKey(key), { force: true });
}

export async function removePrefix(prefix: string): Promise<void> {
  await rm(resolveKey(prefix), { recursive: true, force: true });
}
