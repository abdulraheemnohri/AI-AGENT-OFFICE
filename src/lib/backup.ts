export type WorkspaceBackup = {
  schemaVersion: 1;
  app: "AI Agent Office";
  exportedAt: string;
  data: {
    document: { content: string; name: string };
    workbook: { name: string; cells: string[][]; sheets?: { name: string; cells: string[][] }[] };
    slides: { title: string; body: string }[];
    tasks: { id: number; title: string; done: boolean }[];
    preferences: Record<string, unknown>;
    recovery: unknown;
    pdf?: { name: string; base64: string } | null;
  };
};

export function createBackup(data: WorkspaceBackup["data"], now = new Date()): WorkspaceBackup {
  return { schemaVersion: 1, app: "AI Agent Office", exportedAt: now.toISOString(), data };
}

export function parseBackup(raw: string): WorkspaceBackup {
  if (raw.length > 20 * 1024 * 1024) throw new Error("Backup exceeds the 20 MB import limit");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("Backup must be a JSON object");
  const value = parsed as Partial<WorkspaceBackup>;
  if (value.app !== "AI Agent Office" || value.schemaVersion !== 1 || !value.data) {
    throw new Error("Unsupported backup file or schema version");
  }
  const d = value.data as WorkspaceBackup["data"];
  if (!d.document || typeof d.document.content !== "string" || typeof d.document.name !== "string") throw new Error("Backup document section is invalid");
  if (!d.workbook || typeof d.workbook.name !== "string" || !Array.isArray(d.workbook.cells) || !d.workbook.cells.every(row => Array.isArray(row) && row.every(cell => typeof cell === "string"))) throw new Error("Backup workbook section is invalid");
  if (d.workbook.sheets !== undefined && (!Array.isArray(d.workbook.sheets) || !d.workbook.sheets.length || d.workbook.sheets.length > 50 || !d.workbook.sheets.every(sheet => sheet && typeof sheet.name === "string" && Array.isArray(sheet.cells) && sheet.cells.every(row => Array.isArray(row) && row.every(cell => typeof cell === "string"))))) throw new Error("Backup worksheets section is invalid");
  if (!Array.isArray(d.slides) || !d.slides.every(s => s && typeof s.title === "string" && typeof s.body === "string")) throw new Error("Backup slides section is invalid");
  if (!Array.isArray(d.tasks) || !d.tasks.every(t => t && typeof t.id === "number" && typeof t.title === "string" && typeof t.done === "boolean")) throw new Error("Backup tasks section is invalid");
  if (!d.preferences || typeof d.preferences !== "object") throw new Error("Backup preferences section is invalid");
  if (d.pdf != null && (typeof d.pdf !== "object" || typeof d.pdf.name !== "string" || typeof d.pdf.base64 !== "string" || d.pdf.base64.length > 17 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(d.pdf.base64))) throw new Error("Backup PDF section is invalid or too large");
  return value as WorkspaceBackup;
}


type EncryptedBackupEnvelope = {
  format: "AAO-ENCRYPTED-BACKUP";
  version: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  cipher: "AES-256-GCM";
  salt: string;
  iv: string;
  payload: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function backupCryptoKey(password: string, salt: Uint8Array, iterations: number, usage: KeyUsage[]): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable in this environment");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

/** Encrypts a workspace JSON backup locally. Passwords are never persisted. */
export async function encryptBackupText(plainText: string, password: string): Promise<string> {
  if (password.length < 10 || password.length > 1024) throw new Error("Backup password must be between 10 and 1024 characters");
  if (plainText.length > 20 * 1024 * 1024) throw new Error("Backup exceeds the 20 MB plaintext limit");
  const iterations = 310000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupCryptoKey(password, salt, iterations, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plainText));
  const envelope: EncryptedBackupEnvelope = {
    format: "AAO-ENCRYPTED-BACKUP",
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations,
    cipher: "AES-256-GCM",
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    payload: bytesToBase64(new Uint8Array(encrypted))
  };
  return JSON.stringify(envelope);
}

/** Decrypts an encrypted backup and authenticates its contents before returning JSON text. */
export async function decryptBackupText(envelopeText: string, password: string): Promise<string> {
  if (envelopeText.length > 30 * 1024 * 1024) throw new Error("Encrypted backup exceeds the 30 MB import limit");
  if (password.length < 1 || password.length > 1024) throw new Error("Enter the backup password");
  let parsed: unknown;
  try { parsed = JSON.parse(envelopeText); } catch { throw new Error("Encrypted backup is not valid JSON"); }
  if (!parsed || typeof parsed !== "object") throw new Error("Encrypted backup envelope is invalid");
  const value = parsed as Partial<EncryptedBackupEnvelope>;
  if (value.format !== "AAO-ENCRYPTED-BACKUP" || value.version !== 1 || value.kdf !== "PBKDF2-SHA256" || value.cipher !== "AES-256-GCM") {
    throw new Error("Unsupported encrypted backup format");
  }
  if (!Number.isInteger(value.iterations) || !value.iterations || value.iterations < 100000 || value.iterations > 1000000) throw new Error("Encrypted backup KDF settings are invalid");
  if (typeof value.salt !== "string" || typeof value.iv !== "string" || typeof value.payload !== "string") throw new Error("Encrypted backup data is incomplete");
  const salt = base64ToBytes(value.salt);
  const iv = base64ToBytes(value.iv);
  const payload = base64ToBytes(value.payload);
  if (salt.length !== 16 || iv.length !== 12 || payload.length < 16) throw new Error("Encrypted backup cryptographic data is invalid");
  try {
    const key = await backupCryptoKey(password, salt, value.iterations, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, payload);
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Backup password is incorrect or the encrypted file has been modified");
  }
}
