import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { evaluateCommentQuality } from "./evaluate-comment-quality.mjs";
import { buildIssueTriageComment, ISSUE_TRIAGE_MARKER } from "./issue-triage-markers.mjs";

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const body = (await readFile(options.bodyFile, "utf8")).trim();
  const issue = JSON.parse(
    execFileSync(
      "gh",
      [
        "issue",
        "view",
        options.issue,
        "--repo",
        options.repo,
        "--json",
        "comments",
      ],
      {
        encoding: "utf8",
      },
    ),
  );

  const plan = buildIssueCommentPlan({
    options,
    body,
    comments: issue.comments ?? [],
  });
  if (plan.status !== "ready") {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    process.exit(0);
  }

  const existingCommentId = resolveIssueCommentId(plan.existing_comment);
  if (existingCommentId) {
    execFileSync(
      "gh",
      [
        "api",
        "--method",
        "PATCH",
        `repos/${options.repo}/issues/comments/${existingCommentId}`,
        "-f",
        `body=${plan.comment_body}`,
      ],
      {
        stdio: "inherit",
      },
    );

    process.stdout.write(
      `${JSON.stringify({ status: "updated", comment_id: existingCommentId }, null, 2)}\n`,
    );
    process.exit(0);
  }

  execFileSync(
    "gh",
    [
      "issue",
      "comment",
      options.issue,
      "--repo",
      options.repo,
      "--body",
      plan.comment_body,
    ],
    {
      stdio: "inherit",
    },
  );

  process.stdout.write(`${JSON.stringify({ status: "posted" }, null, 2)}\n`);
}

export function buildIssueCommentPlan({ options, body, comments = [] }) {
  const commentBody = buildIssueTriageComment({
    body,
    fingerprint: options.fingerprint,
  }).trim();
  const evaluation = evaluateCommentQuality({
    body: commentBody,
    subjectKind: "github_issue",
    subjectLocator: `${options.repo}#issue/${options.issue}`,
  });
  if (evaluation.status !== "pass") {
    return {
      status: "noop",
      reason: "comment_quality_needs_review",
      evaluation,
    };
  }

  const existing = comments.find(
    (comment) => typeof comment.body === "string" && comment.body.includes(ISSUE_TRIAGE_MARKER),
  );
  if (existing?.body?.trim() === commentBody) {
    return {
      status: "noop",
      reason: "comment already up to date",
      evaluation,
    };
  }

  return {
    status: "ready",
    comment_body: commentBody,
    existing_comment: existing ?? null,
    evaluation,
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--repo") {
      options.repo = requireValue(argv, ++index, token);
      continue;
    }
    if (token === "--issue") {
      options.issue = requireValue(argv, ++index, token);
      continue;
    }
    if (token === "--body-file") {
      options.bodyFile = requireValue(argv, ++index, token);
      continue;
    }
    if (token === "--fingerprint") {
      options.fingerprint = requireValue(argv, ++index, token);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.repo || !options.issue || !options.bodyFile) {
    throw new Error("--repo, --issue, and --body-file are required.");
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

function resolveIssueCommentId(comment) {
  if (!comment || typeof comment !== "object") {
    return undefined;
  }
  if (typeof comment.databaseId === "number") {
    return String(comment.databaseId);
  }
  if (typeof comment.url === "string") {
    const match = comment.url.match(/issuecomment-(\d+)$/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return undefined;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
