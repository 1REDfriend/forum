/**
 * Client-side E2EE for DM chat.
 *
 * - Key pairs (ECDSA identity + ECDH agreement) are generated in the browser.
 * - Private keys are wrapped with AES-GCM using a key derived from email+password
 *   (PBKDF2-SHA-256) so the server never sees plaintext private keys.
 * - Each message uses a random content key; dual-wrapped for sender + recipient
 *   via ephemeral ECDH so both parties can decrypt later.
 */

const PBKDF2_ITERS = 310_000;
const HKDF_INFO = new TextEncoder().encode('forum-dm-e2ee-v1');
const SESSION_KEY = 'e2ee.session';
/** Session-only email+password from login — used to re-unlock without a second prompt. */
const CRED_KEY = 'e2ee.cred';

export type PublicJwk = JsonWebKey;
export type PrivateJwk = JsonWebKey;

export type KeyBundlePublic = {
  identityPublicKey: string; // JWK JSON
  agreementPublicKey: string;
};

export type StoredKeyBundle = KeyBundlePublic & {
  salt: string;
  wrappedPrivateKeys: string;
  wrapIv: string;
};

export type UnlockedKeys = {
  identityPrivate: CryptoKey;
  identityPublicJwk: PublicJwk;
  agreementPrivate: CryptoKey;
  agreementPublicJwk: PublicJwk;
};

export type E2eeEnvelope = {
  v: 1;
  e2ee: true;
  ct: string;
  iv: string;
  /** userId → wrapped content-key material */
  for: Record<
    string,
    {
      epk: PublicJwk;
      ek: string;
      eiv: string;
    }
  >;
  sig: string;
  spk: PublicJwk;
};

// ── encoding ──────────────────────────────────────────────────────────────

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const u = new Uint8Array(n);
  crypto.getRandomValues(u);
  return u;
}

// ── KDF / wrap ────────────────────────────────────────────────────────────

export async function deriveWrapKey(
  email: string,
  password: string,
  saltB64: string,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${email.trim().toLowerCase()}\0${password}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromB64(saltB64) as BufferSource,
      iterations: PBKDF2_ITERS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function generateIdentityPair() {
  return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
}

async function generateAgreementPair() {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
}

export async function createAndWrapBundle(
  email: string,
  password: string,
): Promise<{ stored: StoredKeyBundle; unlocked: UnlockedKeys }> {
  const salt = randomBytes(16);
  const saltB64 = b64(salt);
  const wrapKey = await deriveWrapKey(email, password, saltB64);

  const identity = await generateIdentityPair();
  const agreement = await generateAgreementPair();

  const identityPublicJwk = await crypto.subtle.exportKey('jwk', identity.publicKey);
  const agreementPublicJwk = await crypto.subtle.exportKey('jwk', agreement.publicKey);
  const identityPrivateJwk = await crypto.subtle.exportKey('jwk', identity.privateKey);
  const agreementPrivateJwk = await crypto.subtle.exportKey('jwk', agreement.privateKey);

  const privPayload = new TextEncoder().encode(
    JSON.stringify({
      identity: identityPrivateJwk,
      agreement: agreementPrivateJwk,
    }),
  );
  const wrapIv = randomBytes(12);
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv as BufferSource },
    wrapKey,
    privPayload,
  );

  const unlocked: UnlockedKeys = {
    identityPrivate: identity.privateKey,
    identityPublicJwk,
    agreementPrivate: agreement.privateKey,
    agreementPublicJwk,
  };

  return {
    stored: {
      salt: saltB64,
      identityPublicKey: JSON.stringify(identityPublicJwk),
      agreementPublicKey: JSON.stringify(agreementPublicJwk),
      wrappedPrivateKeys: b64(wrapped),
      wrapIv: b64(wrapIv),
    },
    unlocked,
  };
}

export async function unlockBundle(
  email: string,
  password: string,
  stored: StoredKeyBundle,
): Promise<UnlockedKeys> {
  const wrapKey = await deriveWrapKey(email, password, stored.salt);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(stored.wrapIv) as BufferSource },
      wrapKey,
      fromB64(stored.wrappedPrivateKeys) as BufferSource,
    );
  } catch {
    throw new Error('ไม่สามารถปลดล็อกกุญแจได้ — ตรวจอีเมล/รหัสผ่านที่ใช้สร้างกุญแจ');
  }
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as {
    identity: PrivateJwk;
    agreement: PrivateJwk;
  };

  // extractable: true so we can re-export into sessionStorage for the tab
  const identityPrivate = await crypto.subtle.importKey(
    'jwk',
    parsed.identity,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );
  const agreementPrivate = await crypto.subtle.importKey(
    'jwk',
    parsed.agreement,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  return {
    identityPrivate,
    identityPublicJwk: JSON.parse(stored.identityPublicKey) as PublicJwk,
    agreementPrivate,
    agreementPublicJwk: JSON.parse(stored.agreementPublicKey) as PublicJwk,
  };
}

// ── session persistence (tab lifetime only) ───────────────────────────────

type SessionBlob = {
  identityPrivate: PrivateJwk;
  identityPublic: PublicJwk;
  agreementPrivate: PrivateJwk;
  agreementPublic: PublicJwk;
};

export async function saveSessionKeys(keys: UnlockedKeys): Promise<void> {
  const blob: SessionBlob = {
    identityPrivate: await crypto.subtle.exportKey('jwk', keys.identityPrivate),
    identityPublic: keys.identityPublicJwk,
    agreementPrivate: await crypto.subtle.exportKey('jwk', keys.agreementPrivate),
    agreementPublic: keys.agreementPublicJwk,
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(blob));
  } catch {
    /* ignore quota */
  }
}

export async function loadSessionKeys(): Promise<UnlockedKeys | null> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const blob = JSON.parse(raw) as SessionBlob;
    const identityPrivate = await crypto.subtle.importKey(
      'jwk',
      blob.identityPrivate,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign'],
    );
    const agreementPrivate = await crypto.subtle.importKey(
      'jwk',
      blob.agreementPrivate,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    );
    return {
      identityPrivate,
      identityPublicJwk: blob.identityPublic,
      agreementPrivate,
      agreementPublicJwk: blob.agreementPublic,
    };
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSessionKeys(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CRED_KEY);
  } catch {
    /* ignore */
  }
}

/** Remember login password for this tab so E2EE unlocks without re-prompting. */
export function saveSessionCred(email: string, password: string): void {
  try {
    sessionStorage.setItem(
      CRED_KEY,
      JSON.stringify({ email: email.trim().toLowerCase(), password }),
    );
  } catch {
    /* ignore */
  }
}

export function loadSessionCred(): { email: string; password: string } | null {
  try {
    const raw = sessionStorage.getItem(CRED_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { email?: string; password?: string };
    if (typeof o.email === 'string' && typeof o.password === 'string' && o.password) {
      return { email: o.email, password: o.password };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSessionCred(): void {
  try {
    sessionStorage.removeItem(CRED_KEY);
  } catch {
    /* ignore */
  }
}

// ── message encrypt / decrypt ─────────────────────────────────────────────

async function ecdhWrapKey(
  ephemeralPrivate: CryptoKey,
  recipientAgreementPublic: CryptoKey,
): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientAgreementPublic },
    ephemeralPrivate,
    256,
  );
  const hkdfBase = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: HKDF_INFO },
    hkdfBase,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function importAgreementPublic(jwk: PublicJwk | string): Promise<CryptoKey> {
  const key = typeof jwk === 'string' ? (JSON.parse(jwk) as PublicJwk) : jwk;
  return crypto.subtle.importKey('jwk', key, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
}

async function wrapContentKeyFor(
  contentKeyRaw: Uint8Array,
  recipientAgreementPublicJwk: PublicJwk | string,
): Promise<{ epk: PublicJwk; ek: string; eiv: string }> {
  const ephemeral = await generateAgreementPair();
  const theirPub = await importAgreementPublic(recipientAgreementPublicJwk);
  const wrapKey = await ecdhWrapKey(ephemeral.privateKey, theirPub);
  const eiv = randomBytes(12);
  const ek = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: eiv as BufferSource },
    wrapKey,
    contentKeyRaw as BufferSource,
  );
  const epk = await crypto.subtle.exportKey('jwk', ephemeral.publicKey);
  return { epk, ek: b64(ek), eiv: b64(eiv) };
}

async function unwrapContentKey(
  slot: { epk: PublicJwk; ek: string; eiv: string },
  myAgreementPrivate: CryptoKey,
): Promise<CryptoKey> {
  const epk = await crypto.subtle.importKey(
    'jwk',
    slot.epk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const wrapKey = await ecdhWrapKey(myAgreementPrivate, epk);
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(slot.eiv) as BufferSource },
    wrapKey,
    fromB64(slot.ek) as BufferSource,
  );
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, [
    'decrypt',
  ]);
}

export async function encryptMessage(
  plaintext: string,
  my: UnlockedKeys,
  myUserId: string,
  peerUserId: string,
  peerAgreementPublicJwk: PublicJwk | string,
): Promise<string> {
  const contentKeyRaw = randomBytes(32);
  const contentKey = await crypto.subtle.importKey(
    'raw',
    contentKeyRaw as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    contentKey,
    new TextEncoder().encode(plaintext),
  );

  const forMap: E2eeEnvelope['for'] = {};
  forMap[peerUserId] = await wrapContentKeyFor(contentKeyRaw, peerAgreementPublicJwk);
  // so sender can re-read their own messages
  forMap[myUserId] = await wrapContentKeyFor(contentKeyRaw, my.agreementPublicJwk);

  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    my.identityPrivate,
    new Uint8Array(ct),
  );

  const envelope: E2eeEnvelope = {
    v: 1,
    e2ee: true,
    ct: b64(ct),
    iv: b64(iv),
    for: forMap,
    sig: b64(sigBuf),
    spk: my.identityPublicJwk,
  };
  return JSON.stringify(envelope);
}

export function tryParseEnvelope(body: string): E2eeEnvelope | null {
  if (!body || body[0] !== '{') return null;
  try {
    const o = JSON.parse(body) as Partial<E2eeEnvelope>;
    if (o.v === 1 && o.e2ee === true && typeof o.ct === 'string' && o.for) {
      return o as E2eeEnvelope;
    }
    return null;
  } catch {
    return null;
  }
}

export async function decryptMessage(
  body: string,
  myUserId: string,
  my: UnlockedKeys | null,
): Promise<{ text: string; verified: boolean | null; encrypted: boolean }> {
  const env = tryParseEnvelope(body);
  if (!env) {
    return { text: body, verified: null, encrypted: false };
  }
  if (!my) {
    return { text: '[ข้อความเข้ารหัส — ปลดล็อกกุญแจเพื่ออ่าน]', verified: null, encrypted: true };
  }
  const slot = env.for[myUserId];
  if (!slot) {
    return { text: '[ข้อความเข้ารหัส — ไม่มีกุญแจสำหรับคุณ]', verified: null, encrypted: true };
  }
  try {
    const contentKey = await unwrapContentKey(slot, my.agreementPrivate);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(env.iv) as BufferSource },
      contentKey,
      fromB64(env.ct) as BufferSource,
    );
    let verified: boolean | null = null;
    try {
      const spk = await crypto.subtle.importKey(
        'jwk',
        env.spk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
      verified = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        spk,
        fromB64(env.sig) as BufferSource,
        fromB64(env.ct) as BufferSource,
      );
    } catch {
      verified = false;
    }
    return { text: new TextDecoder().decode(plain), verified, encrypted: true };
  } catch {
    return { text: '[ถอดรหัสไม่ได้]', verified: false, encrypted: true };
  }
}
