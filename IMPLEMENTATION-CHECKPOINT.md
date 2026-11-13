# Golden-path migration checkpoint

2026-11-13. Branch `codex/application-golden-path`; source branch of the same name at
`/Users/plow/Documents/code/application-monorepo`. No merges/shared deployments,
registry cleanup or live protection/permissions changes.

Prepared: source-CI digest-only handoff verification; signed build/image evidence and exact
successful workflow attempts; selected-source disposable kind QA caller; observed runtime
identity/fixture/config evidence; separately gated certification with current policy, seven-day
freshness/revocation, fresh high/critical Grype scanning and durable report retention before
signing; immutable reviewed config pins and candidate-specific schema/render validation.
Removed new manual candidate assembly; preserved historical artifact contents. Examples stay
inactive. No qualified Releases or active Applications were found during inspection.

Executed: `npm test`, 45 passing tests. YAML parsed and shell syntax checked. Actual source
application Compose smoke/browser tests and cache proofs are in the source checkpoint.
Cross-repository GitHub registry verification, protected QA/certification and production
operations have not run. No runtime or certification success is inferred from unit tests.

Activation: merge reviewed source implementation; pin its action commit (not a moving ref);
verify source-main candidate publication; grant minimum GHCR Actions evidence access;
configure protected certification before enabling CERTIFICATION_ENABLED. Configure/prove
actual production health observation and merge serialization before PRODUCTION_OBSERVER_READY.
Neither variable alone proves governance. Main-only trust intentionally rejects maintenance
branches until a reviewed protected-ref extension/drill. Second-app protected governance,
failed rollout, concurrent promotion, rollback and hotfix drills remain acceptance gates.

Pinned source machinery: `2a194dccf56ae601e4637456bb8360ed1d2c26d2`.

Both review branches were pushed. Draft-PR creation via the GitHub connector failed
with HTTP 403 (Resource not accessible by integration) in both repositories. No PR CI
or protected-main publication was triggered. Source machinery pin remains `2a194dc`.
