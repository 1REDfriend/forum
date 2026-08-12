/**
 * Heavy E2EE DM smoke test against a running API.
 * Usage: bun scripts/e2ee-smoke.mjs [baseUrl]
 * Default: http://localhost:3636
 */
import {
  createAndWrapBundle,
  decryptMessage,
  encryptMessage,
  tryParseEnvelope,
  unlockBundle,
} from '../frontend/src/utils/e2ee.ts';

const BASE = process.argv[2] || 'http://localhost:3636';
const PASS = 'password123';

// Keep small to avoid login rate-limit (429) on repeated local smoke runs.
const ACCOUNTS = [
  { email: 'admin@forum.com', label: 'admin' },
  { email: 'alice@code.com', label: 'alice' },
  { email: 'john@tech.com', label: 'john' },
];

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failed++;
    failures.push(name + (detail ? ': ' + detail : ''));
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  return { status: res.status, data };
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function login(email) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(1500 * attempt);
    last = await api('/auth/login', {
      method: 'POST',
      body: { email, password: PASS },
    });
    if (last.status === 200 && last.data?.token) return last.data;
    if (last.status !== 429) break;
  }
  throw new Error(`login ${email} failed: ${last?.status} ${JSON.stringify(last?.data)}`);
}

async function ensureServerKeys(token, email) {
  const me = await api('/crypto/keys/me', { token });
  if (me.data?.keys?.wrappedPrivateKeys) {
    try {
      const u = await unlockBundle(email, PASS, {
        salt: me.data.keys.salt,
        identityPublicKey: me.data.keys.identityPublicKey,
        agreementPublicKey: me.data.keys.agreementPublicKey,
        wrappedPrivateKeys: me.data.keys.wrappedPrivateKeys,
        wrapIv: me.data.keys.wrapIv,
      });
      return { unlocked: u, created: false };
    } catch {
      // recreate
    }
  }
  const { stored, unlocked } = await createAndWrapBundle(email, PASS);
  const put = await api('/crypto/keys/me', { method: 'PUT', token, body: stored });
  if (put.status !== 200) throw new Error(`put keys: ${JSON.stringify(put.data)}`);
  return { unlocked, created: true };
}

async function main() {
  console.log(`\n=== E2EE heavy smoke @ ${BASE} ===\n`);

  // 0. health
  {
    console.log('0. Health');
    const h = await api('/');
    ok('API up', h.status === 200 && String(h.data?._raw || h.data || '').includes('IT.FORUM'));
  }

  // 1. Login all
  console.log('\n1. Login seed accounts');
  const sessions = {};
  for (const a of ACCOUNTS) {
    try {
      const data = await login(a.email);
      sessions[a.label] = {
        email: a.email,
        token: data.token,
        user: data.user,
      };
      ok(`login ${a.label}`, !!data.token && data.user?.email === a.email, data.user.id);
    } catch (e) {
      ok(`login ${a.label}`, false, e.message);
    }
  }

  // 2. Key bundles
  console.log('\n2. Create/unlock E2EE key bundles');
  for (const label of Object.keys(sessions)) {
    const s = sessions[label];
    try {
      const { unlocked, created } = await ensureServerKeys(s.token, s.email);
      s.unlocked = unlocked;
      ok(`keys ${label}`, !!unlocked?.identityPrivate, created ? 'created' : 'unlocked');

      const pub = await api(`/crypto/keys/${s.user.id}`, { token: s.token });
      ok(
        `public keys ${label} no wrap`,
        !!pub.data?.keys?.agreementPublicKey && !('wrappedPrivateKeys' in (pub.data.keys || {})),
      );
    } catch (e) {
      ok(`keys ${label}`, false, e.message);
    }
  }

  // 3. Wrong password unlock
  console.log('\n3. Negative: wrong password');
  {
    const admin = sessions.admin;
    if (admin?.unlocked) {
      const me = await api('/crypto/keys/me', { token: admin.token });
      let threw = false;
      try {
        await unlockBundle(admin.email, 'WRONG-PASSWORD', {
          salt: me.data.keys.salt,
          identityPublicKey: me.data.keys.identityPublicKey,
          agreementPublicKey: me.data.keys.agreementPublicKey,
          wrappedPrivateKeys: me.data.keys.wrappedPrivateKeys,
          wrapIv: me.data.keys.wrapIv,
        });
      } catch {
        threw = true;
      }
      ok('wrong password rejected', threw);
    } else {
      ok('wrong password rejected', false, 'no admin session');
    }
  }

  // 4. Admin → each peer encrypted DM
  console.log('\n4. Admin sends encrypted DMs to each peer');
  const admin = sessions.admin;
  const sent = [];
  const peerLabels = Object.keys(sessions).filter((l) => l !== 'admin');
  if (admin?.unlocked) {
    for (const label of peerLabels) {
      const peer = sessions[label];
      if (!peer?.unlocked) {
        ok(`dm admin→${label}`, false, 'peer missing');
        continue;
      }
      try {
        const open = await api('/dm/open', {
          method: 'POST',
          token: admin.token,
          body: { userId: peer.user.id },
        });
        ok(`open conv admin↔${label}`, open.status === 201 || open.status === 200, open.data?.id);

        const secret = `SMOKE-${label}-${Date.now()}-สวัสดีแอดมิน`;
        const envelope = await encryptMessage(
          secret,
          admin.unlocked,
          admin.user.id,
          peer.user.id,
          peer.unlocked.agreementPublicJwk,
        );
        ok(`envelope no plaintext ${label}`, !envelope.includes(secret) && tryParseEnvelope(envelope)?.e2ee === true);

        const send = await api(`/dm/${open.data.id}/messages`, {
          method: 'POST',
          token: admin.token,
          body: { body: envelope },
        });
        ok(`send admin→${label}`, send.status === 201, send.data?.id);

        // server-stored body is ciphertext
        ok(
          `server body encrypted ${label}`,
          typeof send.data?.body === 'string' &&
            send.data.body.includes('"e2ee"') &&
            !send.data.body.includes(secret),
        );

        sent.push({
          label,
          conversationId: open.data.id,
          messageId: send.data.id,
          secret,
          peer,
        });
      } catch (e) {
        ok(`dm admin→${label}`, false, e.message);
      }
    }
  }

  // 5. Both sides decrypt + signature verify
  console.log('\n5. Decrypt as admin + peer (signature)');
  for (const item of sent) {
    try {
      const asAdmin = await api(`/dm/${item.conversationId}/messages?limit=50`, {
        token: admin.token,
      });
      const asPeer = await api(`/dm/${item.conversationId}/messages?limit=50`, {
        token: item.peer.token,
      });
      const find = (list) =>
        (list?.data || []).find((m) => m.id === item.messageId) ||
        (list?.data || []).find((m) => m.body?.includes('"e2ee"'));

      const mAdmin = find(asAdmin.data);
      const mPeer = find(asPeer.data);
      ok(`msg visible admin list ${item.label}`, !!mAdmin);
      ok(`msg visible peer list ${item.label}`, !!mPeer);

      if (mAdmin) {
        const d = await decryptMessage(mAdmin.body, admin.user.id, admin.unlocked);
        ok(`admin re-read ${item.label}`, d.text === item.secret && d.verified === true, d.text?.slice(0, 40));
      }
      if (mPeer) {
        const d = await decryptMessage(mPeer.body, item.peer.user.id, item.peer.unlocked);
        ok(`peer decrypt ${item.label}`, d.text === item.secret && d.verified === true, d.text?.slice(0, 40));
      }

      // without keys → locked placeholder
      if (mPeer) {
        const locked = await decryptMessage(mPeer.body, item.peer.user.id, null);
        ok(
          `locked without keys ${item.label}`,
          locked.encrypted && locked.text.includes('ปลดล็อก'),
        );
      }
    } catch (e) {
      ok(`decrypt roundtrip ${item.label}`, false, e.message);
    }
  }

  // 6. Peer replies to admin
  console.log('\n6. Peer replies (alice → admin)');
  {
    const alice = sessions.alice;
    const item = sent.find((s) => s.label === 'alice');
    if (alice?.unlocked && item) {
      try {
        const reply = `REPLY-from-alice-${Date.now()}`;
        const env = await encryptMessage(
          reply,
          alice.unlocked,
          alice.user.id,
          admin.user.id,
          admin.unlocked.agreementPublicJwk,
        );
        const send = await api(`/dm/${item.conversationId}/messages`, {
          method: 'POST',
          token: alice.token,
          body: { body: env },
        });
        ok('alice reply send', send.status === 201);

        const list = await api(`/dm/${item.conversationId}/messages`, { token: admin.token });
        const m = (list.data?.data || []).find((x) => x.id === send.data.id);
        const d = await decryptMessage(m.body, admin.user.id, admin.unlocked);
        ok('admin decrypts alice reply', d.text === reply && d.verified === true, d.text);
      } catch (e) {
        ok('alice reply flow', false, e.message);
      }
    } else {
      ok('alice reply flow', false, 'missing setup');
    }
  }

  // 7. Notifications must not leak secret
  console.log('\n7. Notification snippets');
  {
    const alice = sessions.alice;
    if (alice) {
      const n = await api('/notifications?limit=20', { token: alice.token });
      // endpoint may vary — try a few
      let notifs = n.data?.data || n.data?.notifications || n.data || [];
      if (!Array.isArray(notifs)) notifs = [];
      if (n.status === 404 || n.status === 400) {
        // try without query
        const n2 = await api('/notifications', { token: alice.token });
        notifs = n2.data?.data || n2.data?.notifications || [];
        if (!Array.isArray(notifs)) notifs = [];
        ok('notifications endpoint', n2.status === 200, `status ${n2.status}`);
      } else {
        ok('notifications endpoint', n.status === 200, `status ${n.status} count=${notifs.length}`);
      }
      const dmNotifs = notifs.filter(
        (x) => x.entityType === 'dm' || x.payload?.dm || x.type === 'mention',
      );
      const leaked = dmNotifs.some((x) => {
        const snip = x.payload?.snippet || x.snippet || '';
        return String(snip).includes('SMOKE-') || String(snip).includes('สวัสดี');
      });
      const hasEncryptedLabel = dmNotifs.some((x) =>
        String(x.payload?.snippet || '').includes('เข้ารหัส'),
      );
      ok('no plaintext secret in notifs', !leaked, `dmNotifs=${dmNotifs.length}`);
      if (dmNotifs.length) {
        ok('encrypted placeholder in notif', hasEncryptedLabel || dmNotifs.some((x) => x.payload?.e2ee));
      }
    }
  }

  // 8. Conversation list + unread
  console.log('\n8. Lists / unread');
  if (admin?.token) {
    const list = await api('/dm', { token: admin.token });
    ok('admin conv list', list.status === 200 && Array.isArray(list.data?.conversations));
    ok(
      'admin has ≥1 conv',
      (list.data?.conversations?.length || 0) >= 1,
      String(list.data?.conversations?.length),
    );
    if (sessions.alice?.token) {
      const unread = await api('/dm/unread-count', { token: sessions.alice.token });
      ok(
        'alice unread endpoint',
        unread.status === 200 && typeof unread.data?.count === 'number',
        `count=${unread.data?.count}`,
      );
    }
  } else {
    ok('admin conv list', false, 'no admin session');
  }

  // 9. Cannot DM self
  console.log('\n9. Guards');
  if (admin?.token) {
    const self = await api('/dm/open', {
      method: 'POST',
      token: admin.token,
      body: { userId: admin.user.id },
    });
    ok('cannot open DM with self', self.status >= 400);

    const unauth = await api('/crypto/keys/me');
    ok('crypto requires auth', unauth.status === 401 || unauth.status === 403);

    const huge = await api(`/dm/${sent[0]?.conversationId || 'x'}/messages`, {
      method: 'POST',
      token: admin.token,
      body: { body: 'x'.repeat(20_000) },
    });
    ok('rejects oversized body', huge.status >= 400);
  } else {
    ok('guards', false, 'no admin session');
  }

  // 10. Multi-message flood (10 msgs admin→john)
  console.log('\n10. Flood 10 encrypted messages admin→john');
  {
    const john = sessions.john;
    const item = sent.find((s) => s.label === 'john');
    if (john?.unlocked && item) {
      const secrets = [];
      let allSend = true;
      for (let i = 0; i < 10; i++) {
        const secret = `FLOOD-${i}-${Date.now()}`;
        secrets.push(secret);
        const env = await encryptMessage(
          secret,
          admin.unlocked,
          admin.user.id,
          john.user.id,
          john.unlocked.agreementPublicJwk,
        );
        const send = await api(`/dm/${item.conversationId}/messages`, {
          method: 'POST',
          token: admin.token,
          body: { body: env },
        });
        if (send.status !== 201) allSend = false;
      }
      ok('flood send 10', allSend);

      const list = await api(`/dm/${item.conversationId}/messages?limit=50`, {
        token: john.token,
      });
      const bodies = list.data?.data || [];
      let decOk = 0;
      for (const secret of secrets) {
        // find by decrypting recent
        for (const m of bodies) {
          if (!tryParseEnvelope(m.body)) continue;
          const d = await decryptMessage(m.body, john.user.id, john.unlocked);
          if (d.text === secret && d.verified) {
            decOk++;
            break;
          }
        }
      }
      ok('flood decrypt all 10', decOk === 10, `${decOk}/10`);
    } else {
      ok('flood', false, 'missing john setup');
    }
  }

  // 11. Tamper detection
  console.log('\n11. Tamper ciphertext → decrypt fails or bad sig');
  {
    const item = sent[0];
    if (item) {
      const list = await api(`/dm/${item.conversationId}/messages`, { token: admin.token });
      const m = (list.data?.data || []).find((x) => x.id === item.messageId);
      if (m) {
        const env = tryParseEnvelope(m.body);
        // flip a char in ct
        const bad = { ...env, ct: env.ct.slice(0, -4) + 'XXXX' };
        const d = await decryptMessage(JSON.stringify(bad), admin.user.id, admin.unlocked);
        ok('tampered message not readable as plaintext', d.text !== item.secret && d.encrypted);
      } else {
        ok('tamper test', false, 'msg not found');
      }
    }
  }

  // 12. Cross-user: peer cannot decrypt with wrong private keys
  console.log('\n12. Wrong recipient keys cannot decrypt');
  {
    const item = sent.find((s) => s.label === 'alice');
    const john = sessions.john;
    if (item && john?.unlocked) {
      const list = await api(`/dm/${item.conversationId}/messages`, { token: admin.token });
      const m = (list.data?.data || []).find((x) => x.id === item.messageId);
      // john is not a recipient of admin→alice envelope
      const d = await decryptMessage(m.body, john.user.id, john.unlocked);
      ok(
        'john cannot read admin→alice',
        d.encrypted && (d.text.includes('ไม่มีกุญแจ') || d.text.includes('ถอดรหัส')),
        d.text,
      );
    } else {
      ok('john cannot read admin→alice', false, 'missing setup');
    }
  }

  // 13. Legacy plaintext still works (compat)
  console.log('\n13. Legacy plaintext message compat');
  {
    const alice = sessions.alice;
    if (alice && sent[0]) {
      // open admin-alice
      const item = sent.find((s) => s.label === 'alice');
      const send = await api(`/dm/${item.conversationId}/messages`, {
        method: 'POST',
        token: admin.token,
        body: { body: 'legacy plaintext hello' },
      });
      ok('send legacy plaintext', send.status === 201);
      const d = await decryptMessage(send.data.body, admin.user.id, admin.unlocked);
      ok('legacy shows as plain', d.encrypted === false && d.text === 'legacy plaintext hello');
    }
  }

  // 14. Re-login unlock path (simulate fresh unlock from server blob)
  console.log('\n14. Re-unlock admin keys from server after "new session"');
  if (admin?.token) {
    const me = await api('/crypto/keys/me', { token: admin.token });
    const u = await unlockBundle(admin.email, PASS, {
      salt: me.data.keys.salt,
      identityPublicKey: me.data.keys.identityPublicKey,
      agreementPublicKey: me.data.keys.agreementPublicKey,
      wrappedPrivateKeys: me.data.keys.wrappedPrivateKeys,
      wrapIv: me.data.keys.wrapIv,
    });
    ok('re-unlock admin', !!u.identityPrivate);
    const item = sent[0];
    if (item) {
      const list = await api(`/dm/${item.conversationId}/messages`, { token: admin.token });
      const m = (list.data?.data || []).find((x) => x.id === item.messageId);
      const d = await decryptMessage(m.body, admin.user.id, u);
      ok('re-unlocked admin reads old msg', d.text === item.secret && d.verified === true);
    }
  } else {
    ok('re-unlock admin', false, 'no admin session');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`passed: ${passed}`);
  console.log(`failed: ${failed}`);
  if (failures.length) {
    console.log('failures:');
    for (const f of failures) console.log('  -', f);
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
