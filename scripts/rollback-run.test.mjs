import test from "node:test";
import assert from "node:assert/strict";

import { buildRollbackPlan } from "./rollback-run.mjs";

test("buildRollbackPlan creates a corrective comment body", () => {
  const plan = buildRollbackPlan({
    mode: "issue-comment",
    issue: "12",
    reason: "The earlier comment pointed at the wrong file.",
    commentId: "999",
    replacementBody: "Use the command in README.md instead.",
  });

  assert.equal(plan.status, "ready");
  assert.match(plan.body, /Correction/);
  assert.match(plan.body, /Superseded comment id: `999`/);
});

test("buildRollbackPlan rejects missing PR inputs for generated-pr mode", () => {
  const plan = buildRollbackPlan({
    mode: "generated-pr",
    reason: "Generated patch was incorrect.",
  });

  assert.equal(plan.status, "invalid");
  assert.equal(plan.reason, "pr_required");
});
