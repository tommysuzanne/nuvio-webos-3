const CLIENT_ID_KEY = "nuvio_web_installation_id";
const CLIENT_ID_PREFIX = "nuvio-web-";
const CLIENT_ID_LENGTH = 32;
const CLIENT_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

let volatileClientId = null;

function isValidClientId(value) {
  const normalized = String(value || "").trim();
  return normalized.length >= 16 && normalized.length <= 96 && /^[A-Za-z0-9_-]+$/.test(normalized);
}

function generateClientId() {
  const bytes = new Uint8Array(CLIENT_ID_LENGTH);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  let suffix = "";
  for (const byte of bytes) {
    suffix += CLIENT_ID_ALPHABET[byte % CLIENT_ID_ALPHABET.length];
  }
  return `${CLIENT_ID_PREFIX}${suffix}`;
}

export function getSyncClientId(storage = globalThis.localStorage) {
  if (volatileClientId) {
    return volatileClientId;
  }

  try {
    const stored = storage?.getItem?.(CLIENT_ID_KEY);
    if (isValidClientId(stored)) {
      volatileClientId = String(stored).trim();
      return volatileClientId;
    }
  } catch {
    // Keep a process-local identity when persistent storage is unavailable.
  }

  volatileClientId = generateClientId();
  try {
    storage?.setItem?.(CLIENT_ID_KEY, volatileClientId);
  } catch {
    // The RPC can still use the process-local identity.
  }
  return volatileClientId;
}
