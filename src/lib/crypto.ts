import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashNullable(value: string | null | undefined): string | null {
  return value ? sha256(value) : null;
}

function encryptionKey(keyMaterial?: string): Buffer {
  const secret = keyMaterial ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET должен содержать не менее 32 символов");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string, keyMaterial?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSecret(value: string, keyMaterial?: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Неизвестный формат зашифрованного секрета");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyMaterial),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
