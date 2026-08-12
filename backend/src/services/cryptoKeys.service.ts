import { cryptoKeysRepository, type UpsertCryptoBundle } from '../repositories/cryptoKeys.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const MAX_FIELD = 16_000;

function assertBundle(data: UpsertCryptoBundle) {
  const fields: (keyof UpsertCryptoBundle)[] = [
    'salt',
    'identityPublicKey',
    'agreementPublicKey',
    'wrappedPrivateKeys',
    'wrapIv',
  ];
  for (const k of fields) {
    const v = data[k];
    if (typeof v !== 'string' || !v.trim()) throw BadRequestError(`Missing ${k}`);
    if (v.length > MAX_FIELD) throw BadRequestError(`${k} too long`);
  }
  // Lightweight JWK shape check
  for (const k of ['identityPublicKey', 'agreementPublicKey'] as const) {
    try {
      const jwk = JSON.parse(data[k]) as { kty?: string; crv?: string };
      if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') {
        throw BadRequestError(`${k} must be EC P-256 JWK`);
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'statusCode' in e) throw e;
      throw BadRequestError(`${k} must be valid JWK JSON`);
    }
  }
}

export class CryptoKeysService {
  /** Own full bundle (includes wrapped private keys). */
  async getMine(userId: string) {
    const row = await cryptoKeysRepository.findByUserId(userId);
    if (!row) return null;
    return {
      userId: row.userId,
      salt: row.salt,
      identityPublicKey: row.identityPublicKey,
      agreementPublicKey: row.agreementPublicKey,
      wrappedPrivateKeys: row.wrappedPrivateKeys,
      wrapIv: row.wrapIv,
      updatedAt: row.updatedAt,
    };
  }

  /** Public keys only — for encrypting to a peer. */
  async getPublic(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || user.isBanned) throw NotFoundError('User not found');
    const row = await cryptoKeysRepository.findByUserId(userId);
    if (!row) return null;
    return {
      userId: row.userId,
      identityPublicKey: row.identityPublicKey,
      agreementPublicKey: row.agreementPublicKey,
    };
  }

  async upsertMine(userId: string, data: UpsertCryptoBundle) {
    assertBundle(data);
    const row = await cryptoKeysRepository.upsert(userId, {
      salt: data.salt.trim(),
      identityPublicKey: data.identityPublicKey.trim(),
      agreementPublicKey: data.agreementPublicKey.trim(),
      wrappedPrivateKeys: data.wrappedPrivateKeys.trim(),
      wrapIv: data.wrapIv.trim(),
    });
    return {
      userId: row.userId,
      salt: row.salt,
      identityPublicKey: row.identityPublicKey,
      agreementPublicKey: row.agreementPublicKey,
      updatedAt: row.updatedAt,
    };
  }
}

export const cryptoKeysService = new CryptoKeysService();
