---
title: Hosted Flows
description: The concrete GitHub workflows that make automaton a live runx dogfood target.
---

# Hosted Flows

## `docs-pages`

Builds and deploys the Sourcey site from committed docs sources. This keeps the
public documentation live even when the external caller bridge is offline.

## `sourcey-refresh`

Runs the `runx` `sourcey` skill against this repo, auto-approves the bounded
docs plan, validates the resulting docs source with a fresh Sourcey build, and
opens a draft PR.

## `issue-to-pr`

Listens for every normal issue except `[skill]` proposals. The workflow:

1. runs `support-triage`
2. posts the triage reply back to the issue
3. passes bounded requests into `issue-to-pr`
4. lets scafld carry the spec, audit, review, and archive lifecycle
5. opens a draft PR from the resulting branch

## `pr-triage`

Builds a live PR snapshot, runs it through `github-triage`, and posts a
maintainer comment back to the PR. Comment dedupe prevents repeated posts for
the same head SHA.

## `skill-learning`

Listens for issues whose title begins with `[skill]`, runs
`objective-to-skill`, materializes the result under `docs/skill-proposals/`,
and opens a draft PR with the generated proposal.
