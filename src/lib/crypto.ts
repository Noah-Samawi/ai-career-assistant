import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const MAGIC = Buffer.from("NCV1"); // file format marker/version

export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function keyFrom(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("Encryption key must decode to exactly 32 bytes");
  return key;
}

/** Layout: MAGIC(4) | IV(12) | TAG(16) | CIPHERTEXT */
export function encryptBuffer(plain: Buffer, base64Key: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, keyFrom(base64Key), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(blob: Buffer, base64Key: string): Buffer {
  if (!blob.subarray(0, 4).equals(MAGIC)) throw new Error("Unknown encrypted file format");
  const iv = blob.subarray(4, 4 + IV_LEN);
  const tag = blob.subarray(4 + IV_LEN, 4 + IV_LEN + TAG_LEN);
  const ct = blob.subarray(4 + IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, keyFrom(base64Key), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}
