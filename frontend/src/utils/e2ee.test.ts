import { describe, expect, it } from 'vitest';
import {
  createAndWrapBundle,
  decryptMessage,
  encryptMessage,
  tryParseEnvelope,
  unlockBundle,
} from './e2ee';

describe('e2ee', () => {
  it('wraps keys with email+password and dual-encrypts a message', async () => {
    const email = 'alice@gmail.com';
    const password = 'test-pass-123';
    const { stored, unlocked: alice } = await createAndWrapBundle(email, password);
    const unlockedAgain = await unlockBundle(email, password, stored);
    expect(unlockedAgain.identityPublicJwk.x).toBe(alice.identityPublicJwk.x);

    const { unlocked: bob } = await createAndWrapBundle('bob@gmail.com', 'bob-pass');
    const body = await encryptMessage('สวัสดี E2EE', alice, 'alice-id', 'bob-id', bob.agreementPublicJwk);
    expect(tryParseEnvelope(body)?.e2ee).toBe(true);
    // Server-readable body should not contain plaintext
    expect(body.includes('สวัสดี')).toBe(false);

    const asAlice = await decryptMessage(body, 'alice-id', alice);
    const asBob = await decryptMessage(body, 'bob-id', bob);
    expect(asAlice.text).toBe('สวัสดี E2EE');
    expect(asBob.text).toBe('สวัสดี E2EE');
    expect(asAlice.verified).toBe(true);
    expect(asBob.verified).toBe(true);
    expect(asAlice.encrypted).toBe(true);
  });

  it('rejects wrong password', async () => {
    const { stored } = await createAndWrapBundle('x@gmail.com', 'right');
    await expect(unlockBundle('x@gmail.com', 'wrong', stored)).rejects.toThrow();
  });
});
