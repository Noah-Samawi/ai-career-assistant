import bcrypt from "bcryptjs";

const COST = 12;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, COST);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

let dummyHash: Promise<string> | null = null;
/** Burns comparable time for unknown users to make user enumeration via timing harder. */
export async function dummyVerify(pw: string): Promise<false> {
  dummyHash ??= bcrypt.hash("dummy-password-for-timing", COST);
  await bcrypt.compare(pw, await dummyHash);
  return false;
}
