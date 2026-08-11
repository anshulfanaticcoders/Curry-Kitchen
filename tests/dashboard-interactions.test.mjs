import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("dashboard feedback appears at the bottom right", () => {
  const providers = source("src/components/providers/app-providers.tsx");

  assert.match(providers, /position="bottom-right"/);
});

test("shared dashboard controls cannot accidentally submit the form around them", () => {
  const interactive = source("src/components/dashboard/interactive.tsx");

  assert.match(interactive, /role="tab"\s+type="button"/);
  assert.match(interactive, /role="switch"\s+type="button"/);
  assert.match(
    interactive,
    /type="button"[\s\S]{0,160}aria-label="Close panel"/,
  );
});

test("dashboard tables can render a reusable productive empty state", () => {
  const primitives = source("src/components/dashboard/primitives.tsx");

  assert.match(primitives, /export function EmptyState/);
  assert.match(primitives, /title: string/);
  assert.match(primitives, /action\?: ReactNode/);
});
