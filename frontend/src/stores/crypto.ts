import { defineStore } from 'pinia';
import { computed, markRaw, shallowRef, ref } from 'vue';
import { extrasApi } from '../api/index.js';
import {
  clearSessionKeys,
  createAndWrapBundle,
  loadSessionCred,
  loadSessionKeys,
  saveSessionCred,
  saveSessionKeys,
  unlockBundle,
  type UnlockedKeys,
} from '../utils/e2ee.js';

/** CryptoKey must not be deeply reactive — Vue proxies break WebCrypto. */
function rawKeys(u: UnlockedKeys): UnlockedKeys {
  return markRaw({
    identityPrivate: markRaw(u.identityPrivate),
    identityPublicJwk: u.identityPublicJwk,
    agreementPrivate: markRaw(u.agreementPrivate),
    agreementPublicJwk: u.agreementPublicJwk,
  });
}

/**
 * E2EE key state for DM chat.
 * Private keys: memory + sessionStorage only.
 * Login password kept in sessionStorage this tab so unlock is silent.
 */
export const useCryptoStore = defineStore('crypto', () => {
  const unlocked = shallowRef<UnlockedKeys | null>(null);
  const ready = ref(false);
  const unlocking = ref(false);
  const error = ref('');
  const hasServerBundle = ref(false);

  const isUnlocked = computed(() => !!unlocked.value);

  async function hydrateFromSession() {
    unlocking.value = true;
    error.value = '';
    try {
      const keys = await loadSessionKeys();
      if (keys) {
        unlocked.value = rawKeys(keys);
        return true;
      }
      const cred = loadSessionCred();
      if (cred) {
        await ensureKeys(cred.email, cred.password, { alreadyHaveCred: true });
        return !!unlocked.value;
      }
      unlocked.value = null;
      return false;
    } catch (e: unknown) {
      console.error('[e2ee] hydrate failed', e);
      error.value = e instanceof Error ? e.message : 'E2EE hydrate failed';
      unlocked.value = null;
      return false;
    } finally {
      unlocking.value = false;
      ready.value = true;
    }
  }

  /**
   * Create or unlock keys from email+password (from login form — never re-prompt).
   * If server blob is corrupt / wrong wrap, recreate with this password.
   */
  async function ensureKeys(
    email: string,
    password: string,
    opts?: { alreadyHaveCred?: boolean },
  ) {
    unlocking.value = true;
    error.value = '';
    if (!opts?.alreadyHaveCred) {
      saveSessionCred(email, password);
    }
    try {
      const { keys } = await extrasApi.getMyCryptoKeys();
      if (keys) {
        hasServerBundle.value = true;
        try {
          const u = await unlockBundle(email, password, {
            salt: keys.salt,
            identityPublicKey: keys.identityPublicKey,
            agreementPublicKey: keys.agreementPublicKey,
            wrappedPrivateKeys: keys.wrappedPrivateKeys,
            wrapIv: keys.wrapIv,
          });
          unlocked.value = rawKeys(u);
          await saveSessionKeys(u);
          return;
        } catch (unlockErr) {
          // Corrupt keys (e.g. old smoke test) or password changed — mint new bundle.
          console.warn('[e2ee] unlock failed, recreating key bundle', unlockErr);
        }
      }

      const { stored, unlocked: u } = await createAndWrapBundle(email, password);
      await extrasApi.putMyCryptoKeys(stored);
      unlocked.value = rawKeys(u);
      await saveSessionKeys(u);
      hasServerBundle.value = true;
    } catch (e: unknown) {
      console.error('[e2ee] ensureKeys failed', e);
      const msg = e instanceof Error ? e.message : 'E2EE unlock failed';
      error.value = msg;
      unlocked.value = null;
      throw e;
    } finally {
      unlocking.value = false;
      ready.value = true;
    }
  }

  function lock() {
    unlocked.value = null;
    clearSessionKeys();
    error.value = '';
    ready.value = true;
  }

  return {
    unlocked,
    ready,
    unlocking,
    error,
    hasServerBundle,
    isUnlocked,
    hydrateFromSession,
    ensureKeys,
    lock,
  };
});
