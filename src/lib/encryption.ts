const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

export const ENCRYPTION_VERSION = "enc_v1";

function getCrypto() {
  return require("crypto") as typeof import("crypto");
}

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  const derived = getCrypto().createHash("sha256").update(key).digest();
  if (derived.length !== 32) {
    throw new Error("ENCRYPTION_KEY must derive a 32-byte key for AES-256");
  }
  return derived;
}

export function validateEncryptionKey(): void {
  getEncryptionKey();
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromBase64Url(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function encrypt(plaintext: string): string {
  const crypto = getCrypto();
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  const final = cipher.final();
  const ciphertext = Buffer.concat([encrypted, final]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTION_VERSION}:${toBase64Url(iv)}:${toBase64Url(tag)}:${toBase64Url(ciphertext)}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  // Versioned format: enc_v1:iv:tag:ciphertext (base64url)
  if (encryptedText.startsWith(`${ENCRYPTION_VERSION}:`)) {
    const parts = encryptedText.slice(ENCRYPTION_VERSION.length + 1).split(":");
    if (parts.length !== 3) {
      return encryptedText;
    }

    const key = getEncryptionKey();
    const iv = fromBase64Url(parts[0]);
    const tag = fromBase64Url(parts[1]);
    const ciphertext = fromBase64Url(parts[2]);

    const decipher = getCrypto().createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext);
    const final = decipher.final();
    return Buffer.concat([decrypted, final]).toString("utf8");
  }

  // Legacy format: iv:tag:ciphertext (hex)
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    return encryptedText;
  }

  let key: Buffer;
  try {
    key = getEncryptionKey();
  } catch {
    return encryptedText;
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const ciphertext = parts[2];

  const decipher = getCrypto().createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
