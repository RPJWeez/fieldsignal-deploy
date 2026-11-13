import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
export function validateRun(actual, expected) {
  assert.equal(actual.status, "completed");
  assert.equal(
    actual.conclusion,
    "success",
    "issuing workflow attempt must complete successfully",
  );
  assert.equal(actual.repository.full_name, expected.repository);
  assert.equal(String(actual.id), String(expected.run));
  assert.equal(String(actual.run_attempt), String(expected.attempt));
  assert.equal(actual.head_sha, expected.source);
  assert.equal(actual.head_branch, "main");
  assert.equal(actual.event, expected.event);
  assert.equal(actual.path, expected.workflow);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const expected = JSON.parse(process.argv[2]);
  assert.match(expected.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  assert.match(String(expected.run), /^\d+$/);
  assert.match(String(expected.attempt), /^\d+$/);
  const actual = JSON.parse(
    execFileSync(
      "gh",
      [
        "api",
        `repos/${expected.repository}/actions/runs/${expected.run}/attempts/${expected.attempt}`,
      ],
      { encoding: "utf8" },
    ),
  );
  validateRun(actual, expected);
}
