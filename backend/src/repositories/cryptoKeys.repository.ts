import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userCryptoKeys } from '../db/schema.js';

export type CryptoKeyBundleRow = typeof userCryptoKeys.$inferSelect;

export type UpsertCryptoBundle = {
  salt: string;
  identityPublicKey: string;
  agreementPublicKey: string;
  wrappedPrivateKeys: string;
  wrapIv: string;
};

export class CryptoKeysRepository {
  async findByUserId(userId: string) {
    const [row] = await db
      .select()
      .from(userCryptoKeys)
      .where(eq(userCryptoKeys.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async upsert(userId: string, data: UpsertCryptoBundle) {
    const existing = await this.findByUserId(userId);
    if (existing) {
      const [row] = await db
        .update(userCryptoKeys)
        .set({
          salt: data.salt,
          identityPublicKey: data.identityPublicKey,
          agreementPublicKey: data.agreementPublicKey,
          wrappedPrivateKeys: data.wrappedPrivateKeys,
          wrapIv: data.wrapIv,
          updatedAt: new Date(),
        })
        .where(eq(userCryptoKeys.userId, userId))
        .returning();
      return row!;
    }
    const [row] = await db
      .insert(userCryptoKeys)
      .values({
        userId,
        salt: data.salt,
        identityPublicKey: data.identityPublicKey,
        agreementPublicKey: data.agreementPublicKey,
        wrappedPrivateKeys: data.wrappedPrivateKeys,
        wrapIv: data.wrapIv,
      })
      .returning();
    return row!;
  }
}

export const cryptoKeysRepository = new CryptoKeysRepository();
