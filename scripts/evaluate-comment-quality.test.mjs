import test from "node:test";
import assert from "node:assert/strict";

import { evaluateCommentQuality } from "./evaluate-comment-quality.mjs";
import { buildIssueTriageComment } from "./issue-triage-markers.mjs";

test("evaluateCommentQuality passes a structured bounded comment", () => {
  const evaluation = evaluateCommentQuality({
    body: buildIssueTriageComment({
      body: [
        "Thanks for the report.",
        "",
        "- Please narrow this to one broken command in the README.",
        "- Share the exact command and actual output so the next step is reproducible.",
      ].join("\n"),
      fingerprint: "abc12345deadbeef",
    }),
    subjectKind: "github_issue",
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.checks.marker_present, true);
  assert.equal(evaluation.checks.has_next_step, true);
});

test("evaluateCommentQuality flags a thin comment for review", () => {
  const evaluation = evaluateCommentQuality({
    body: "Looks good.",
    subjectKind: "github_pull_request",
  });

  assert.equal(evaluation.status, "needs_review");
});
