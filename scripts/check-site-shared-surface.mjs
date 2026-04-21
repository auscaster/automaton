import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDir, "..");

const forbiddenRunxTargets = [
  "api",
  "auth",
  "db",
  "worker",
  "agent-runner",
  "receipts-store",
  "mcp-hosted",
  "aster",
];

export async function assertAsterSiteSharedSurface(options = {}) {
  const repoRoot = path.resolve(options.repoRoot ?? defaultRepoRoot);
  const siteRoot = path.join(repoRoot, "site");
  const astroConfigPath = path.join(siteRoot, "astro.config.mjs");
  const baseLayoutPath = path.join(siteRoot, "src", "layouts", "BaseLayout.astro");
  const foundationPath = path.join(siteRoot, "src", "styles", "foundation.css");
  const violations = [];

  const astroConfig = await readFile(astroConfigPath, "utf8");
  if (/["']@runx(?:-|\b)/u.test(astroConfig) || /runxPackagesPath/u.test(astroConfig)) {
    violations.push("site/astro.config.mjs must not alias runx packages or monorepo paths.");
  }

  const baseLayout = await readFile(baseLayoutPath, "utf8");
  if (!baseLayout.includes('import "../styles/foundation.css";')) {
    violations.push("site/src/layouts/BaseLayout.astro must import the repo-owned foundation stylesheet.");
  }

  const foundation = await readFile(foundationPath, "utf8");
  if (!foundation.includes("@layer reset, tokens, base, effects, components, pages, utilities;")) {
    violations.push("site/src/styles/foundation.css must declare the shared cascade layer order.");
  }

  const siteFiles = await collectSiteSourceFiles(path.join(siteRoot, "src"));
  for (const filePath of siteFiles) {
    const source = await readFile(filePath, "utf8");
    for (const specifier of parseImportSpecifiers(source)) {
      const violation = describeForbiddenSpecifier(specifier);
      if (violation) {
        violations.push(`${path.relative(repoRoot, filePath)} imports '${specifier}': ${violation}`);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(violations.join("\n"));
  }

  return true;
}

async function collectSiteSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSiteSourceFiles(entryPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!/\.(astro|[cm]?[jt]sx?)$/u.test(entry.name)) {
      continue;
    }
    files.push(entryPath);
  }
  return files;
}

function parseImportSpecifiers(source) {
  const specifiers = new Set();
  for (const match of source.matchAll(/(?:import|export)\s+(?:[^"'`]*?\sfrom\s*)?["']([^"']+)["']/gu)) {
    specifiers.add(match[1]);
  }
  for (const match of source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/gu)) {
    specifiers.add(match[1]);
  }
  return Array.from(specifiers);
}

function describeForbiddenSpecifier(specifier) {
  if (specifier.startsWith("@runx") || specifier.startsWith("@runx-")) {
    return "aster site imports must be repo-owned; runx package aliases are not allowed.";
  }

  if (/runx\/cloud\/apps\/web/u.test(specifier)) {
    return "runx web app code is not a shared surface.";
  }

  if (/runx(?:\/cloud)?\/packages\/(?:tokens|ui)(?:\/|$)/u.test(specifier)) {
    return "aster site must vendor its build-time CSS surface instead of importing runx packages directly.";
  }

  if (new RegExp(`runx(?:/cloud)?/packages/(?:${forbiddenRunxTargets.join("|")})(?:/|$)`, "u").test(specifier)) {
    return "runx runtime internals are not part of the shared site surface.";
  }

  return "";
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await assertAsterSiteSharedSurface();
  process.stdout.write("aster site shared surface check passed\n");
}
