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

test("loads Plus Jakarta Sans for display type and IBM Plex Sans for body type", () => {
  const layout = readFileSync(join(projectRoot, "src/app/layout.tsx"), "utf8");

  assert.match(layout, /import \{ IBM_Plex_Sans, Plus_Jakarta_Sans \} from "next\/font\/google";/);
  assert.match(layout, /const display = Plus_Jakarta_Sans\(\{/);
  assert.match(layout, /const body = IBM_Plex_Sans\(\{/);
});

test("uses Plus Jakarta Sans's supported display-black weight", () => {
  const globalStyles = readFileSync(join(projectRoot, "src/app/globals.css"), "utf8");

  assert.match(
    globalStyles,
    /\.font-display\.font-black\s*\{\s*font-weight:\s*800;/,
  );
});

test("display headings avoid unreadably compressed arbitrary line-heights", () => {
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
      const isUnsafe = arbitraryLeading !== undefined && Number(arbitraryLeading) < 0.9;

      if (isUnsafe) {
        const line = source.slice(0, match.index).split("\n").length;
        unsafeHeadings.push(`${relative(projectRoot, file)}:${line}`);
      }
    }
  }

  assert.deepEqual(unsafeHeadings, []);
});
