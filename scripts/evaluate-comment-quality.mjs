import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { parseIssueTriageCommentMetadata, stripIssueTriageMarker } from "./issue-triage-markers.mjs";

export function evaluateCommentQuality({ body, subjectKind = "unknown", subjectLocator = null }) {
  const normalized = stripIssueTriageMarker(body);
  const metadata = parseIssueTriageCommentMetadata(body);
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const checks = {
    marker_present: metadata.has_marker,
    bounded_length: normalized.length >= 80 && normalized.length <= 2400,
    has_next_step: /\b(next|please|recommend|suggest|run|share|verify|open|update|narrow|clarify|add)\b/i.test(normalized),
    has_structure: /^[-*]\s|\n[-*]\s|\n##?\s/m.test(normalized),
    substantive: wordCount >= 20,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    schema: "runx.comment_eval.v1",
    subject_kind: subjectKind,
    subject_locator: subjectLocator,
    status: checks.bounded_length && checks.has_next_step && checks.substantive ? "pass" : "needs_review",
    checks,
    score: Math.round((passed / Object.keys(checks).length) * 1000) / 1000,
    metrics: {
      character_count: normalized.length,
      word_count: wordCount,
    },
  };
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const body = await readFile(options.bodyFile, "utf8");
  const evaluation = evaluateCommentQuality({
    body,
    subjectKind: options.subjectKind,
    subjectLocator: options.subjectLocator,
  });
  const serialized = `${JSON.stringify(evaluation, null, 2)}\n`;
  if (options.output) {
    await writeFile(options.output, serialized);
  }
  process.stdout.write(serialized);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--body-file") {
      options.bodyFile = requireValue(argv, ++index, token);
      continue;
    }
    if (token === "--subject-kind") {
      options.subjectKind = requireValue(argv, ++index, token);
      continue;
    }
    if (token === "--subject-locator") {
      options.subjectLocator = requireValue(argv, ++index, token);
      continue;
    }
    if (token === "--output") {
      options.output = requireValue(argv, ++index, token);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.bodyFile) {
    throw new Error("--body-file is required.");
  }
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
