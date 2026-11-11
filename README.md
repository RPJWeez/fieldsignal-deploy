# FieldSignal application delivery

GitOps configuration for [FieldSignal](https://github.com/RPJWeez/delivery-reference-platform). Components publish independently; complete application candidates are qualified and promoted together.

## Operating model

1. Select published image digests in a standard Helm chart under candidates/<version>/.
2. Run **Publish and qualify an application candidate** on main with that version.
3. The workflow verifies artifact evidence, vendors the shared chart, publishes/signs the candidate, and deploys its OCI digest through one Argo CD Application in disposable kind.
4. Browser business tests and API/Kafka replay tests must pass. A signed qualification and GitHub Release retain the exact candidate/test inputs.
5. Promote by PR changing an environment Application targetRevision to the qualified digest. CI verifies signatures, provenance, SBOM and qualification, rejects image overrides, and renders the prospective environment.
6. Observe Argo sync/health before merging the next promotion into the same environment. A Git merge alone does not prove deployment health, and GitOps may coalesce rapid updates.
7. Restore a retained compatible candidate through another PR. No component rebuild is involved; external data/events are not automatically undone.

There is no custom release JSON, dependency graph or deployment renderer.

## Layout

- candidates/: standard Helm wrapper charts with exact image pins and a vendored chart dependency.
- environments/: legitimate environment differences and one complete-application Argo Application per environment.
- bootstrap/: namespace-scoped AppProject and local setup instructions.
- schemas/ and tests/: standard JSON Schema and configuration behavior tests.

Bootstrap Application files remain .example and inactive until a genuine candidate is qualified. No fabricated digest is active desired state.

## First release

Use the published application chart version 0.2.0 initially. Each workload selects an actual image digest, port, replicas, probes, runtime settings and secret references. The source publication summaries provide digest references; never substitute latest tags or rebuild from a source branch.

Candidate workflow actions are pinned by source commit. Qualification records the test-suite digest, deployment revision, runner architecture and workflow URL. Promote the same OCI digest without rebuilding. Changing a selection requires a new candidate version and qualification.

```sh
npm ci
npm test
```

Keep both repositories and demo packages public. Configure main to require PRs and the GitHub Actions ci check after bootstrap. Zero approvals supports a solo maintainer; independent approval requires another reviewer.

## Cost and retention

Use standard public runners, public GHCR/Maven/npm packages, disposable kind and local Argo CD. No persistent cloud resources, paid runners, Nx Cloud or Apigee instance are created.

Retain every qualified/deployed/rollback candidate, its components, signatures, SBOMs and evidence. Failure browser reports retain 14 days. Registry cleanup is report-only initially; never blindly purge untagged OCI manifests.

Environment settings can vary endpoints, secret references, resources and replicas, but not images or business rules. These differences still require review; qualification does not establish identical environments or instantaneous rollout.
