import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(path);
    }

    return [".tsx", ".jsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

test("loads Montagu Slab for display type and Figtree for body type", () => {
  const layout = readFileSync(join(projectRoot, "src/app/layout.tsx"), "utf8");

  assert.match(layout, /import \{ Figtree, Montagu_Slab \} from "next\/font\/google";/);
  assert.match(layout, /const display = Montagu_Slab\(\{/);
  assert.match(layout, /const body = Figtree\(\{/);
});

test("caps legacy black display text at Montagu Slab's supported maximum weight", () => {
  const globalStyles = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");

  assert.match(
    globalStyles,
    /\.font-display\.font-black\s*\{\s*font-weight:\s*700;\s*\}/,
  );
});

test("display headings do not use explicit line-heights below 1.12", () => {
  const unsafeHeadings = [];
  const headingTag = /<(?:motion\.)?h[1-3]\b[^>]*>|<RevealItem\b(?=[^>]*\bas="h[1-3]")[^>]*>/gs;

  for (const file of sourceFiles(join(projectRoot, "src"))) {
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(headingTag)) {
      const className = match[0].match(/\bclassName="([^"]*)"/s)?.[1] ?? "";

      if (!className.includes("font-display")) {
        continue;
      }

      const arbitraryLeading = className.match(/\bleading-\[(\d+(?:\.\d+)?)\]/)?.[1];
      const isUnsafe = className.includes("leading-none") ||
        (arbitraryLeading !== undefined && Number(arbitraryLeading) < 1.12);

      if (isUnsafe) {
        const line = source.slice(0, match.index).split("\n").length;
        unsafeHeadings.push(`${relative(projectRoot, file)}:${line}`);
      }
    }
  }

  assert.deepEqual(unsafeHeadings, []);
});
