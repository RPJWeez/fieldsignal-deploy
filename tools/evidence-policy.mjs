import assert from "node:assert/strict";
import { createHash } from "node:crypto";
export const policyDigest = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
// Inputs must be the output of gh attestation verify with exact issuer/workflow/ref.
// This module validates payload scope; it does not perform cryptographic verification.
export function qualifiedEvidence(
  statements,
  candidate,
  policy,
  now = Date.now(),
) {
  const matches = statements
    .map((s) => s.verificationResult?.statement)
    .filter(
      (s) =>
        s?.predicate?.candidate === candidate &&
        s.predicateType === policy.qaPredicate,
    );
  assert(matches.length, "verified QA evidence for exact candidate required");
  return (
    matches
      .map((s) => s.predicate)
      .find((p) => {
        try {
          assert.equal(p.result, "passed");
          assert.match(p.deploymentRevision, /^[a-f0-9]{40}$/);
          assert.match(p.testRevision, /^[a-f0-9]{40}$/);
          for (const key of [
            "configurationDigest",
            "fixturesDigest",
            "observedDigest",
          ])
            assert.match(p[key], /^sha256:[a-f0-9]{64}$/);
          assert(policy.architectures.includes(p.architecture));
          assert(p.run && p.attempt && p.platform);
          assert.equal(p.observedCandidate, candidate);
          const timestamp = Date.parse(p.completedAt);
          assert(
            Number.isFinite(timestamp) &&
              timestamp <= now &&
              now - timestamp <= policy.qaMaxAgeSeconds * 1000,
          );
          return true;
        } catch {
          return false;
        }
      }) ||
    assert.fail(
      "QA evidence is incomplete, failed, expired, or outside coverage",
    )
  );
}
export function certifiedEvidence(
  statements,
  candidate,
  policy,
  digest,
  now = Date.now(),
) {
  assert(!policy.revokedCandidates.includes(candidate), "candidate is revoked");
  const decision = statements
    .map((s) => s.verificationResult?.statement)
    .find(
      (s) =>
        s?.predicateType === policy.certificationPredicate &&
        s.predicate?.candidate === candidate &&
        s.predicate?.policyDigest === digest,
    )?.predicate;
  assert(decision, "current-policy certification required");
  assert.equal(decision.result, "eligible");
  assert.match(decision.qaEvidenceDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(decision.buildEvidenceDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(decision.securityEvidenceDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(decision.securityThreshold, policy.securityThreshold);
  assert(
    Number.isFinite(Date.parse(decision.expiresAt)) &&
      Date.parse(decision.expiresAt) > now,
    "certification expired",
  );
  assert(Date.parse(decision.issuedAt) <= now, "future certification");
  assert(
    Date.parse(decision.expiresAt) - Date.parse(decision.issuedAt) <=
      policy.certificationMaxAgeSeconds * 1000,
    "excessive certification lifetime",
  );
  return decision;
}
