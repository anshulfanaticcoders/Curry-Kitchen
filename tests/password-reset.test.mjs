import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", code)((id) => {
    assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency ${id}`);
    return dependencies[id];
  }, exports);
  return exports;
}

function database() {
  const state = { users: [{ id: "customer1", name: "Customer", email: "customer@example.test", passwordHash: "old-hash" },
    { id: "admin1", name: "Admin", email: "admin@example.test", passwordHash: "admin-hash" }], tokens: [], sessions: [{ userId: "customer1" }] };
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    if (key === "identifier_token") return matches(row, value);
    if (key === "expires" && !(value instanceof Date)) return (!value.lte || row.expires <= value.lte) && (!value.gt || row.expires > value.gt);
    return row[key] === value;
  });
  let queue = Promise.resolve();
  const db = {
    user: {
      findUnique: async ({ where }) => structuredClone(state.users.find(row => matches(row, where)) ?? null),
      updateMany: async ({ where, data }) => { const rows = state.users.filter(row => matches(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length }; },
    },
    verificationToken: {
      findUnique: async ({ where }) => structuredClone(state.tokens.find(row => matches(row, where)) ?? null),
      create: async ({ data }) => { if (state.tokens.some(row => row.identifier === data.identifier && row.token === data.token)) throw Object.assign(new Error("duplicate"), { code: "P2002" }); state.tokens.push(structuredClone(data)); return data; },
      updateMany: async ({ where, data }) => { const rows = state.tokens.filter(row => matches(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length }; },
      deleteMany: async ({ where }) => { const before = state.tokens.length; state.tokens = state.tokens.filter(row => !matches(row, where)); return { count: before - state.tokens.length }; },
      upsert: async ({ where, create, update }) => { const row = state.tokens.find(row => matches(row, where)); if (row) Object.assign(row, update); else state.tokens.push(create); },
    },
    session: { deleteMany: async ({ where }) => { state.sessions = state.sessions.filter(row => !matches(row, where)); } },
    $transaction: (fn) => {
      const result = queue.then(async () => { const before = structuredClone(state); try { return await fn(db); } catch (error) { Object.assign(state, before); throw error; } });
      queue = result.catch(() => {});
      return result;
    },
  };
  return { db, state };
}

function setup(options = {}) {
  const { db, state } = database();
  const deliveries = [];
  const session = load("../src/lib/auth-session.ts", { "server-only": {}, "@/lib/db": { db } });
  const reset = load("../src/lib/password-reset.ts", {
    "server-only": {}, "node:crypto": crypto, zod: { z }, "@/lib/db": { db },
    "@/lib/app-url": { getAppUrl: () => options.origin ?? "https://currykitcheninc.com" },
    "@/lib/auth-session": session,
    "@/lib/password": { hashPassword: options.hashPassword ?? (async value => `hashed:${value}`) },
    "@/lib/email/templates": { createPasswordResetEmail: async value => value },
    "@/lib/email/send": { sendTransactionalEmail: async value => { deliveries.push(value); return { sent: options.sent !== false }; } },
  });
  const token = (index = 0) => new URLSearchParams(new URL(deliveries[index].email.resetUrl).hash.slice(1)).get("token");
  const input = (value = token()) => ({ token: value, password: "NewPassword123!", confirmPassword: "NewPassword123!" });
  return { ...reset, db, state, deliveries, session, token, input };
}

test("email normalization and password confirmation/byte limits are enforced", () => {
  const s = setup();
  assert.equal(s.forgotPasswordSchema.parse({ email: " CUSTOMER@EXAMPLE.TEST " }).email, "customer@example.test");
  assert.equal(s.forgotPasswordSchema.safeParse({ email: "bad" }).success, false);
  const token = `customer1.${"a".repeat(64)}`;
  for (const password of ["short", "x".repeat(73), "é".repeat(37)]) assert.equal(s.resetPasswordSchema.safeParse({ ...s.input(token), password, confirmPassword: password }).success, false);
  assert.equal(s.resetPasswordSchema.safeParse({ ...s.input(token), confirmPassword: "different" }).success, false);
  assert.equal(s.resetPasswordSchema.safeParse(s.input(token)).success, true);
  assert.equal(s.resetPasswordSchema.safeParse(s.input("not-a-token")).success, false);
});

test("customer and admin reset emails use random hashed tokens, trusted origin, and 30-minute expiry", async () => {
  const s = setup();
  await s.requestPasswordReset("customer@example.test");
  await s.requestPasswordReset("admin@example.test");
  assert.equal(s.deliveries.length, 2);
  assert.notEqual(s.token(0).split(".")[1], s.token(1).split(".")[1]);
  for (const [i, delivery] of s.deliveries.entries()) {
    const url = new URL(delivery.email.resetUrl);
    assert.equal(url.origin, "https://currykitcheninc.com");
    assert.equal(url.pathname, "/reset-password");
    assert.equal(url.search, "");
    const secret = s.token(i).split(".")[1];
    assert.equal(secret.length, 64);
    assert.ok(!JSON.stringify(s.state.tokens).includes(secret), "plaintext secrets must not be stored");
    assert.equal(delivery.email.expiryMinutes, 30);
  }
  const link = s.state.tokens.find(row => row.identifier === "password-reset-link:customer1");
  assert.ok(link.expires - Date.now() > 29 * 60_000 && link.expires - Date.now() <= 30 * 60_000);
  assert.equal(s.state.users[0].passwordHash, "old-hash", "requesting a reset does not change a password");
  assert.equal(await s.session.isPasswordSessionCurrent({ sub: "customer1" }), true);
});

test("unknown accounts and passwordless users receive no email or token", async () => {
  const s = setup();
  s.state.users[0].passwordHash = null;
  await s.requestPasswordReset("unknown@example.test");
  await s.requestPasswordReset("customer@example.test");
  assert.equal(s.deliveries.length, 0);
  assert.equal(s.state.tokens.length, 0);
});

test("database cooldown throttles duplicate and simultaneous requests, then permits a retry", async () => {
  const s = setup();
  await Promise.all(Array.from({ length: 8 }, () => s.requestPasswordReset("customer@example.test")));
  assert.equal(s.deliveries.length, 1);
  s.state.tokens.find(row => row.token === "cooldown").expires = new Date(0);
  await s.requestPasswordReset("customer@example.test");
  assert.equal(s.deliveries.length, 2);
});

test("successful reset consumes all links, changes only that user, and revokes old sessions", async () => {
  const s = setup();
  await s.requestPasswordReset("customer@example.test");
  const first = s.token();
  s.state.tokens.find(row => row.token === "cooldown").expires = new Date(0);
  await s.requestPasswordReset("customer@example.test");
  assert.deepEqual(await s.resetPassword(s.input(first)), { email: "customer@example.test", name: "Customer" });
  assert.equal(s.state.users[0].passwordHash, "hashed:NewPassword123!");
  assert.equal(s.state.users[1].passwordHash, "admin-hash");
  assert.equal(await s.resetPassword(s.input(first)), null);
  assert.equal(await s.resetPassword(s.input(s.token(1))), null);
  assert.equal(s.state.sessions.length, 0);
  assert.equal(await s.session.isPasswordSessionCurrent({ sub: "customer1" }), false, "legacy sessions are revoked");
  const version = await s.session.getPasswordResetVersion("customer1");
  assert.equal(await s.session.isPasswordSessionCurrent({ sub: "customer1", passwordResetVersion: version }), true);
  assert.equal(await s.session.isPasswordSessionCurrent({ sub: "admin1" }), true, "other users remain signed in");
});

test("expired, tampered, wrong-user and already-changed credentials cannot reset a password", async () => {
  const s = setup();
  await s.requestPasswordReset("customer@example.test");
  assert.equal(await s.resetPassword(s.input(`customer1.${"0".repeat(64)}`)), null);
  assert.equal(await s.resetPassword(s.input(s.token().replace("customer1", "admin1"))), null);
  const link = s.state.tokens.find(row => row.identifier.startsWith("password-reset-link:"));
  link.expires = new Date(0);
  assert.equal(await s.resetPassword(s.input()), null);
  link.expires = new Date(Date.now() + 60_000);
  s.state.users[0].passwordHash = "changed-outside-reset";
  assert.equal(await s.resetPassword(s.input()), null);
  assert.equal(s.state.users[0].passwordHash, "changed-outside-reset");
});

test("two simultaneous uses of a valid link succeed only once", async () => {
  const s = setup();
  await s.requestPasswordReset("customer@example.test");
  const results = await Promise.all([s.resetPassword(s.input()), s.resetPassword(s.input())]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("expiry during hashing rolls back the password update", async () => {
  let state;
  const s = setup({ hashPassword: async () => { state.tokens.find(row => row.identifier.startsWith("password-reset-link:")).expires = new Date(0); return "new-hash"; } });
  state = s.state;
  await s.requestPasswordReset("customer@example.test");
  assert.equal(await s.resetPassword(s.input()), null);
  assert.equal(s.state.users[0].passwordHash, "old-hash");
  assert.equal(await s.session.getPasswordResetVersion("customer1"), 0);
});

test("failed transaction preserves the old password and usable token", async () => {
  const s = setup();
  await s.requestPasswordReset("customer@example.test");
  s.db.session.deleteMany = async () => { throw new Error("test database failure"); };
  await assert.rejects(s.resetPassword(s.input()));
  assert.equal(s.state.users[0].passwordHash, "old-hash");
  assert.ok(s.state.tokens.some(row => row.identifier.startsWith("password-reset-link:")));
});

test("failed email removes the undelivered link without changing credentials", async () => {
  const s = setup({ sent: false });
  await s.requestPasswordReset("customer@example.test");
  assert.equal(s.state.tokens.filter(row => row.identifier.startsWith("password-reset-link:")).length, 0);
  assert.equal(s.state.users[0].passwordHash, "old-hash");
});

test("password helper hashes and verifies the new password, not the old one", async () => {
  const hash = await hashPassword("NewPassword123!");
  assert.notEqual(hash, "NewPassword123!");
  assert.equal(await verifyPassword("NewPassword123!", hash), true);
  assert.equal(await verifyPassword("OldPassword123!", hash), false);
});

test("recovery endpoint gives the same immediate reply and defers all account work", async () => {
  const old = process.env.RESEND_API_KEY;
  const oldFrom = process.env.MAIL_FROM;
  process.env.RESEND_API_KEY = "test-key";
  process.env.MAIL_FROM = "test@example.test";
  try {
    const s = setup();
    const jobs = [];
    const route = load("../src/app/api/auth/forgot-password/route.ts", {
      "next/server": { after: job => jobs.push(job) }, "@/lib/password-reset": s,
    });
    const post = value => route.POST(new Request("https://untrusted-host.example/api/auth/forgot-password", { method: "POST", body: JSON.stringify(value) }));
    const known = await post({ email: "customer@example.test" });
    const unknown = await post({ email: "unknown@example.test" });
    assert.equal(known.status, 200);
    assert.deepEqual(await known.json(), await unknown.json());
    assert.equal(known.headers.get("Cache-Control"), "no-store");
    assert.equal(s.deliveries.length, 0);
    for (const job of jobs) await job();
    assert.equal(s.deliveries.length, 1);
    assert.equal(new URL(s.deliveries[0].email.resetUrl).origin, "https://currykitcheninc.com");
    assert.equal((await post({ email: "invalid" })).status, 400);
    delete process.env.RESEND_API_KEY;
    assert.equal((await post({ email: "customer@example.test" })).status, 503);
    assert.equal((await post({ email: "unknown@example.test" })).status, 503);
  } finally {
    if (old === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = old;
    if (oldFrom === undefined) delete process.env.MAIL_FROM; else process.env.MAIL_FROM = oldFrom;
  }
});

test("reset endpoint rejects invalid input, confirms only success and never auto-signs in", async () => {
  const s = setup();
  await s.requestPasswordReset("customer@example.test");
  const jobs = [];
  const confirmations = [];
  const route = load("../src/app/api/auth/reset-password/route.ts", {
    "next/server": { after: job => jobs.push(job) }, "@/lib/password-reset": s,
    "@/lib/email/templates": { createPasswordChangedEmail: async input => input },
    "@/lib/email/send": { sendTransactionalEmail: async input => confirmations.push(input) },
  });
  const post = value => route.POST(new Request("https://currykitcheninc.com/api/auth/reset-password", { method: "POST", body: JSON.stringify(value) }));
  assert.equal((await post({ ...s.input(), confirmPassword: "wrong" })).status, 400);
  const response = await post(s.input());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Set-Cookie"), null);
  assert.deepEqual(await response.json(), { ok: true });
  for (const job of jobs) await job();
  assert.equal(confirmations[0].to, "customer@example.test");
  assert.ok(!JSON.stringify(confirmations).includes("NewPassword123!"));
  assert.equal((await post(s.input())).status, 400);
});

test("NextAuth rejects old credentials and sessions but accepts the new password after reset", async () => {
  const s = setup();
  const { authOptions } = load("../src/lib/auth.ts", {
    "@auth/prisma-adapter": { PrismaAdapter: () => ({}) },
    "next-auth": { getServerSession: () => ({}) },
    "next-auth/providers/credentials": { default: options => options },
    zod: { z }, "@/lib/db": { db: s.db }, "@/lib/auth-session": s.session,
    "@/lib/password": { verifyPassword: async (password, hash) => hash === "old-hash" ? password === "OldPassword123!" : hash === `hashed:${password}` },
  });
  const authorize = authOptions.providers[0].authorize;
  const oldUser = await authorize({ email: "customer@example.test", password: "OldPassword123!" });
  const oldToken = await authOptions.callbacks.jwt({ token: { sub: oldUser.id }, user: oldUser });
  await s.requestPasswordReset("customer@example.test");
  await s.resetPassword(s.input());
  assert.equal(await authorize({ email: "customer@example.test", password: "OldPassword123!" }), null);
  await assert.rejects(authOptions.callbacks.jwt({ token: oldToken }), /Password changed/);
  await assert.rejects(authOptions.callbacks.jwt({ token: { sub: "customer1" } }), /Password changed/);
  const newUser = await authorize({ email: "customer@example.test", password: "NewPassword123!" });
  assert.equal(newUser.id, "customer1");
  const newToken = await authOptions.callbacks.jwt({ token: { sub: newUser.id }, user: newUser });
  assert.equal((await authOptions.callbacks.jwt({ token: newToken })).sub, "customer1");
});

test("password changed during sign-in cannot issue an authenticated session", async () => {
  const s = setup();
  const { authOptions } = load("../src/lib/auth.ts", {
    "@auth/prisma-adapter": { PrismaAdapter: () => ({}) }, "next-auth": { getServerSession: () => ({}) },
    "next-auth/providers/credentials": { default: options => options }, zod: { z },
    "@/lib/db": { db: s.db }, "@/lib/auth-session": s.session,
    "@/lib/password": { verifyPassword: async () => { s.state.users[0].passwordHash = "changed-during-login"; return true; } },
  });
  assert.equal(await authOptions.providers[0].authorize({ email: "customer@example.test", password: "OldPassword123!" }), null);
});
