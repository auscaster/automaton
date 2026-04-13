import { readFile, writeFile } from "node:fs/promises";

const options = parseArgs(process.argv.slice(2));
const report = JSON.parse(await readFile(options.input, "utf8"));
const payload = JSON.parse(report.execution.stdout);
const triage = payload.triage_report ?? {};
const defaultComment =
  triage.suggested_reply ??
  `runx classified this request as ${triage.recommended_lane ?? "manual-triage"} and did not open a PR.`;

const output = triage.recommended_lane === "issue-to-pr" && triage.issue_to_pr_request
  ? {
      mode: "issue-to-pr",
      triage_report: triage,
      issue_to_pr_request: triage.issue_to_pr_request,
      comment_body: defaultComment,
    }
  : {
      mode: "comment",
      triage_report: triage,
      comment_body: defaultComment,
    };

if (options.output) {
  await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input") {
      options.input = requireValue(argv, ++index, token);
      continue;
    }
    if (token === "--output") {
      options.output = requireValue(argv, ++index, token);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.input) {
    throw new Error("--input is required.");
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
