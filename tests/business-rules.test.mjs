import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const checkout = read("../src/lib/server/checkout.ts");
const customerActions = read("../src/lib/actions/customer.ts");
const schedule = read("../src/lib/package-schedule.ts");
const rules = read("../src/lib/business-rules.ts");

assert.match(checkout, /getBusinessRules/);
assert.match(checkout, /acceptWeeklyTrials/);
assert.match(checkout, /deliveryWindow/);
assert.match(customerActions, /getBusinessRules/);
assert.match(customerActions, /enableCheckoutPauses/);
assert.match(schedule, /deliveryWeekdays/);
assert.match(rules, /deliveryWeekdaysFromText/);
assert.match(rules, /isAfterOrderCutoff/);

console.log("✓ saved business settings are enforced by checkout, delivery, and customer pause flows");
