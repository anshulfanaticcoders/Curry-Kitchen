import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("notification controls persist read state through customer server actions", () => {
  const client = readFileSync(
    join(process.cwd(), "src/components/dashboard/notifications-client.tsx"),
    "utf8",
  );

  assert.match(client, /markAllNotificationsReadAction/);
  assert.match(client, /markNotificationReadAction/);
  assert.match(client, /startTransition/);
  assert.match(client, /router\.refresh\(\)/);
});

test("customer communication preferences are loaded and saved instead of staying local", () => {
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(join(process.cwd(), "src/lib/actions/customer.ts"), "utf8");
  const profile = readFileSync(
    join(process.cwd(), "src/components/dashboard/customer-profile-client.tsx"),
    "utf8",
  );

  assert.match(schema, /emailReceipts\s+Boolean\s+@default\(true\)/);
  assert.match(schema, /smsUpdates\s+Boolean\s+@default\(false\)/);
  assert.match(actions, /export async function saveCustomerCommunicationPreferencesAction/);
  assert.match(
    actions.split("saveCustomerCommunicationPreferencesAction", 2)[1],
    /db\.customer\.upsert/,
  );
  assert.match(profile, /saveCustomerCommunicationPreferencesAction/);
  assert.match(profile, /emailReceipts/);
  assert.match(profile, /smsUpdates/);
});
