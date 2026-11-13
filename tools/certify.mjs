import fs from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { qualifiedEvidence, policyDigest } from "./evidence-policy.mjs";
const bytes = fs.readFileSync("policy.json"),
  policy = JSON.parse(bytes),
  candidate = process.env.REFERENCE;
assert(!policy.revokedCandidates.includes(candidate), "candidate revoked");
const qaBytes = fs.readFileSync(".work/verified-qa.json");
const qa = qualifiedEvidence(JSON.parse(qaBytes), candidate, policy);
const runURL = new URL(qa.run);
assert.equal(runURL.origin, "https://github.com");
const qaRepository = policy.qaWorkflow.split("/.github/")[0];
assert.match(
  runURL.pathname,
  new RegExp(`^/${qaRepository}/actions/runs/[0-9]+$`),
);
execFileSync(
  "node",
  [
    "tools/verify-run.mjs",
    JSON.stringify({
      repository: qaRepository,
      run: runURL.pathname.split("/").at(-1),
      attempt: qa.attempt,
      source: qa.deploymentRevision,
      event: "workflow_dispatch",
      workflow: ".github/workflows/qa.yml",
    }),
  ],
  { stdio: "inherit" },
);
const security = JSON.parse(fs.readFileSync(".work/security.json"));
assert.equal(security.result, "passed");
assert.equal(security.threshold, policy.securityThreshold);
assert(
  security.reports.length ===
    new Set(
      Object.values(
        JSON.parse(fs.readFileSync(".work/candidate/build.json")).images,
      ),
    ).size,
);
const now = Date.now();
fs.writeFileSync(
  ".work/certification.json",
  JSON.stringify(
    {
      candidate,
      result: "eligible",
      policyDigest: policyDigest(bytes),
      qaEvidenceDigest: policyDigest(qaBytes),
      buildEvidenceDigest: policyDigest(
        fs.readFileSync(".work/candidate/verified-build.json"),
      ),
      securityEvidenceDigest: policyDigest(
        fs.readFileSync(".work/security.json"),
      ),
      securityThreshold: security.threshold,
      qaRun: qa.run,
      qaAttempt: qa.attempt,
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(
        Math.min(
          now + policy.certificationMaxAgeSeconds * 1000,
          Date.parse(qa.completedAt) + policy.qaMaxAgeSeconds * 1000,
        ),
      ).toISOString(),
      workflowRevision: process.env.GITHUB_SHA,
      run: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT,
    },
    null,
    2,
  ) + "\n",
);
