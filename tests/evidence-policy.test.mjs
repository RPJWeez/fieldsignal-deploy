import { test } from "node:test";
import assert from "node:assert/strict";
import {
  qualifiedEvidence,
  certifiedEvidence,
  policyDigest,
} from "../tools/evidence-policy.mjs";
const now = Date.parse("2026-11-13T12:00:00Z");
const hash = `sha256:${"a".repeat(64)}`,
  candidate = `ghcr.io/harbor/tide@${hash}`;
const policy = {
  qaPredicate: "qa/v1",
  certificationPredicate: "cert/v1",
  architectures: ["x86_64"],
  qaMaxAgeSeconds: 3600,
  certificationMaxAgeSeconds: 3600,
  revokedCandidates: [],
  securityThreshold: "high",
};
const qa = () => ({
  candidate,
  result: "passed",
  observedCandidate: candidate,
  deploymentRevision: "b".repeat(40),
  testRevision: "c".repeat(40),
  configurationDigest: hash,
  fixturesDigest: hash,
  observedDigest: hash,
  architecture: "x86_64",
  run: "1",
  attempt: "2",
  platform: "kind@pinned",
  completedAt: new Date(now).toISOString(),
});
const verified = (type, predicate) => [
  { verificationResult: { statement: { predicateType: type, predicate } } },
];
test("QA evidence scopes exact artifact, config, fixtures, platform and attempt", () =>
  assert.equal(
    qualifiedEvidence(verified("qa/v1", qa()), candidate, policy, now).attempt,
    "2",
  ));
for (const [name, mutate] of [
  ["failed", (p) => (p.result = "failed")],
  ["wrong subject", (p) => (p.candidate += "wrong")],
  ["changed environment", (p) => (p.observedCandidate += "wrong")],
  ["missing fixtures", (p) => delete p.fixturesDigest],
  ["no platform", (p) => delete p.platform],
  ["expired", (p) => (p.completedAt = "2020-01-01")],
  ["uncovered architecture", (p) => (p.architecture = "arm64")],
  ["future", (p) => (p.completedAt = new Date(now + 1000).toISOString())],
])
  test(`reject QA ${name}`, () => {
    const p = qa();
    mutate(p);
    assert.throws(() =>
      qualifiedEvidence(verified("qa/v1", p), candidate, policy, now),
    );
  });
const certification = () => ({
  candidate,
  result: "eligible",
  policyDigest: hash,
  qaEvidenceDigest: hash,
  buildEvidenceDigest: hash,
  securityEvidenceDigest: hash,
  securityThreshold: "high",
  issuedAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 3600000).toISOString(),
});
test("certification requires current policy and exact candidate", () => {
  assert.equal(
    certifiedEvidence(
      verified("cert/v1", certification()),
      candidate,
      policy,
      hash,
      now,
    ).result,
    "eligible",
  );
  assert.notEqual(policyDigest("policy-v1"), policyDigest("policy-v2"));
});
for (const [name, mutate] of [
  ["old policy", (p) => (p.policyDigest += "wrong")],
  ["wrong candidate", (p) => (p.candidate += "wrong")],
  ["missing build evidence", (p) => delete p.buildEvidenceDigest],
  ["expired", (p) => (p.expiresAt = new Date(now).toISOString())],
  [
    "excessive lifetime",
    (p) => (p.expiresAt = new Date(now + 7200000).toISOString()),
  ],
  ["QA-only result", (p) => (p.result = "passed")],
])
  test(`reject certification ${name}`, () => {
    const p = certification();
    mutate(p);
    assert.throws(() =>
      certifiedEvidence(verified("cert/v1", p), candidate, policy, hash, now),
    );
  });
test("uncertified, wrong authority predicate, and revoked candidates fail closed", () => {
  assert.throws(() => certifiedEvidence([], candidate, policy, hash, now));
  assert.throws(() =>
    certifiedEvidence(
      verified("candidate-build/v1", certification()),
      candidate,
      policy,
      hash,
      now,
    ),
  );
  assert.throws(() =>
    certifiedEvidence(
      verified("cert/v1", certification()),
      candidate,
      { ...policy, revokedCandidates: [candidate] },
      hash,
      now,
    ),
  );
});
