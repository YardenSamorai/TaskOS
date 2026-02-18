const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getCrypto() {
  return require("crypto") as typeof import("crypto");
}

function getEncryptionKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    return null;
  }
  return getCrypto().createHash("sha256").update(key).digest();
}

export function encrypt(plaintext: string): string {
  const crypto = getCrypto();
  const key = getEncryptionKey();
  if (!key) {
    return plaintext;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    return encryptedText;
  }

  const key = getEncryptionKey();
  if (!key) {
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
