import test from "node:test";
import assert from "node:assert/strict";

import { buildSkillLabComment, SKILL_LAB_MARKER } from "./post-skill-lab-comment.mjs";

test("buildSkillLabComment renders the rolling issue status comment", () => {
  const comment = buildSkillLabComment({
    objective: "Add an issue-ledger distillation skill",
    runUrl: "https://github.com/nilstate/aster/actions/runs/123",
    ledgerRevision: "deadbeefcafebabe",
    workflowStatus: "success",
    publish: {
      status: "published",
      pr_number: 111,
      pr_url: "https://github.com/nilstate/aster/pull/111",
    },
  });

  assert.match(comment, new RegExp(SKILL_LAB_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(comment, /Draft PR: \[#111\]/);
  assert.match(comment, /Ledger revision: `deadbeefcafebabe`/);
  assert.match(comment, /Reply in this work issue with maintainer amendments/);
});

test("buildSkillLabComment reports a failed run consistently", () => {
  const comment = buildSkillLabComment({
    objective: "Add an issue-ledger distillation skill",
    workflowStatus: "failure",
  });

  assert.match(comment, /Status: `run_failed`/);
});

test("buildSkillLabComment reports proposal_refreshed when publish is not requested", () => {
  const comment = buildSkillLabComment({
    objective: "Add an issue-ledger distillation skill",
    workflowStatus: "success",
    publish: {
      status: "not_requested",
    },
  });

  assert.match(comment, /Status: `proposal_refreshed`/);
});
