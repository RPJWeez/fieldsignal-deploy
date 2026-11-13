import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRun } from "../tools/verify-run.mjs";
const expected = {
  repository: "harbor/tide",
  run: "42",
  attempt: "2",
  source: "a".repeat(40),
  event: "push",
  workflow: ".github/workflows/ci.yml",
};
const fixture = () => ({
  status: "completed",
  conclusion: "success",
  repository: { full_name: expected.repository },
  id: 42,
  run_attempt: 2,
  head_sha: expected.source,
  head_branch: "main",
  event: "push",
  path: expected.workflow,
});
test("exact immutable workflow attempt is required, not latest successful name", () =>
  assert.doesNotThrow(() => validateRun(fixture(), expected)));
for (const [name, mutate] of [
  ["failed", (r) => (r.conclusion = "failure")],
  ["partial", (r) => (r.status = "in_progress")],
  ["another repository", (r) => (r.repository.full_name = "evil/tide")],
  ["PR authority", (r) => (r.event = "pull_request")],
  ["wrong workflow", (r) => (r.path = ".github/workflows/qa.yml")],
  ["wrong source", (r) => (r.head_sha = "b".repeat(40))],
  ["wrong attempt", (r) => (r.run_attempt = 3)],
  ["wrong run", (r) => (r.id = 43)],
  ["unprotected ref", (r) => (r.head_branch = "feature")],
])
  test(`reject issuing run ${name}`, () => {
    const r = fixture();
    mutate(r);
    assert.throws(() => validateRun(r, expected));
  });
