import test from "node:test";
import assert from "node:assert/strict";

import { evaluateGeneratedPr } from "./evaluate-generated-pr.mjs";
import { ensureGeneratedPrPolicyBlock } from "./generated-pr-policy.mjs";

test("evaluateGeneratedPr passes a published PR with policy and validation", () => {
  const evaluation = evaluateGeneratedPr({
    publish: {
      status: "published",
      policy: { lane: "issue-triage" },
      change_summary: {
        file_count: 2,
        additions: 12,
        deletions: 3,
      },
    },
    body: ensureGeneratedPrPolicyBlock("## Summary\n\nBounded PR body.", {
      lane: "issue-triage",
    }),
    validation: {
      verification_profile: "docs",
      commands: ["npm test"],
    },
  });

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.checks.policy_present, true);
});

test("evaluateGeneratedPr flags missing policy blocks", () => {
  const evaluation = evaluateGeneratedPr({
    publish: {
      status: "published",
      change_summary: {
        file_count: 1,
        additions: 4,
        deletions: 0,
      },
    },
    body: "## Summary\n\nNo policy block here.",
    validation: {},
  });

  assert.equal(evaluation.status, "needs_review");
  assert.equal(evaluation.checks.policy_present, false);
});
