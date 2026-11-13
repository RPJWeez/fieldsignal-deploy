import assert from "node:assert/strict";

// The outer GitOps pointer may follow protected main; these runtime sources may not.
export function validateApplication(app, environment) {
  assert.equal(app.kind, "Application");
  assert.deepEqual(Object.keys(app.spec).sort(), [
    "destination",
    "project",
    "sources",
    "syncPolicy",
  ]);
  assert.equal(app.spec.destination.server, "https://kubernetes.default.svc");
  assert.equal(
    app.spec.sources.length,
    2,
    "exactly candidate and configuration sources required",
  );
  assert.deepEqual(Object.keys(app.spec).sort(), [
    "destination",
    "project",
    "sources",
    "syncPolicy",
  ]);
  assert.equal(app.spec.destination.server, "https://kubernetes.default.svc");
  assert.equal(app.spec.source, undefined, "alternate source forbidden");
  const [candidate, config] = app.spec.sources;
  assert.deepEqual(Object.keys(candidate).sort(), [
    "helm",
    "path",
    "repoURL",
    "targetRevision",
  ]);
  assert.match(candidate.repoURL, /^oci:\/\/ghcr\.io\/[a-z0-9._/-]+$/);
  assert.match(candidate.targetRevision, /^sha256:[a-f0-9]{64}$/);
  assert.equal(candidate.path, ".");
  assert.deepEqual(
    Object.keys(candidate.helm).sort(),
    ["releaseName", "valueFiles"],
    "Helm override routes forbidden",
  );
  assert.deepEqual(candidate.helm.valueFiles, [
    `$config/environments/${environment}/values.yaml`,
  ]);
  assert.deepEqual(Object.keys(config).sort(), [
    "ref",
    "repoURL",
    "targetRevision",
  ]);
  assert.equal(config.ref, "config");
  assert.equal(
    config.repoURL,
    "https://github.com/RPJWeez/fieldsignal-deploy.git",
  );
  assert.match(
    config.targetRevision,
    /^[a-f0-9]{40}$/,
    "runtime configuration must pin an existing immutable commit",
  );
  assert.equal(app.spec.destination.namespace, `fieldsignal-${environment}`);
  return {
    candidate: `${candidate.repoURL.slice(6)}@${candidate.targetRevision}`,
    configuration: config.targetRevision,
  };
}
