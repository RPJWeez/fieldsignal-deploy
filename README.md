# FieldSignal application delivery

The source repository owns complete OCI Helm candidate creation. This repository owns
configuration, separate disposable QA, signed eligibility decisions and reviewed promotion
pairs. It never rebuilds application components or assembles manual image combinations.

## Prepared operating path

1. Take the exact digest from source CI's `candidate-handoff`. `qa.yml` verifies the trusted
   main workflow/source/run/attempt, candidate and all image evidence before checking out
   tests. It deploys the same candidate through Argo in disposable kind, checks runtime
   identity before/after application-owned browser/API/Kafka tests, signs scoped evidence,
   and deletes the temporary cluster. No latest-run lookup or mutable tag is used.
2. `certify.yml` verifies the successful issuing build/QA attempts, current policy, expiry,
   revocation and fresh high/critical vulnerability scanning. It retains raw security reports
   before signing eligibility on the original registry digest. CI and QA workflow signatures
   cannot satisfy the certification issuer policy. No separate certified storage is used.
3. Commit configuration first. Propose an existing reviewed configuration commit with the
   certified candidate digest in the environment Application. CI rejects moving config and
   all alternate Helm override routes, verifies current certification, and renders the exact
   config commit against the selected candidate's packaged schema and image closure.
4. GitOps deploys reviewed desired state. A selected runtime observer/merge interlock must
   serialize production through observed health; Git merges are not health evidence.

## Activation and limits

These workflows are prepared, not demonstrated cross-repository live capability. All
Application examples remain inactive. `CERTIFICATION_ENABLED` must remain unset until
the certification environment/ref protection and registry evidence access are configured.
No duplicate human approval is required for automatic technical certification. The normal
production decision remains review of the promotion pair. Production activation is blocked
unless `PRODUCTION_OBSERVER_READY=true`; configure and prove the actual observer/merge
interlock before setting that variable. A variable alone is not runtime enforcement.

No shared cluster, live protection, package access permission, artifact visibility or
registry contents were changed. No active Applications or qualified Releases existed in
the inspected checkout/GitHub Releases list. Legacy artifacts are preserved; review any
out-of-band retained deployment before changing its trust policy.

Run `npm ci && npm test`. See [implementation checkpoint](IMPLEMENTATION-CHECKPOINT.md)
and the source [operator runbook](https://github.com/RPJWeez/delivery-reference-platform/blob/codex/application-golden-path/docs/operator-runbook.md)
for executed checks, activation gates, recovery and remaining acceptance drills.

Rollback selects a retained compatible candidate/configuration pair under current policy.
It does not reverse database changes or external events. Main-only trust is deliberate;
maintenance-branch hotfix publication needs an explicit protected-ref policy extension and
an executed drill. Never substitute one hotfix image into an old candidate.
