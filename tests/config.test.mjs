import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import Ajv from "ajv";

const root = path.resolve(import.meta.dirname, "..");
const read = (p) => parse(fs.readFileSync(path.join(root, p), "utf8"));
const validate = new Ajv({ allErrors: true }).compile(
  JSON.parse(
    fs.readFileSync(path.join(root, "schemas/environment.schema.json")),
  ),
);

for (const environment of ["qualification", "staging", "production"]) {
  test(`${environment} permits environment differences without changing release selection`, () => {
    const values = read(`environments/${environment}/values.yaml`);
    assert(validate(values), JSON.stringify(validate.errors));
    const changed = structuredClone(values);
    changed.application.workloads["ingestion-service"].image =
      "ghcr.io/example/new:latest";
    assert.equal(validate(changed), false, "image overrides must be rejected");
    delete changed.application.workloads["ingestion-service"].image;
    changed.application.workloads["ingestion-service"].env.DATABASE_PASSWORD =
      "cleartext";
    assert.equal(
      validate(changed),
      false,
      "credentials must be secret references",
    );
  });

  test(`${environment} is one whole-application OCI source with a restricted values source`, () => {
    const actual = `environments/${environment}/application.yaml`;
    const active = fs.existsSync(path.join(root, actual));
    const app = read(active ? actual : `${actual}.example`);
    assert.equal(app.kind, "Application");
    assert.equal(app.metadata.name, `fieldsignal-${environment}`);
    assert.equal(app.spec.project, "fieldsignal");
    assert.equal(app.spec.sources.length, 2);
    const [candidate, config] = app.spec.sources;
    assert.equal(
      candidate.repoURL,
      "oci://ghcr.io/rpjweez/delivery-reference-platform-candidates/fieldsignal",
    );
    assert.equal(candidate.path, ".");
    if (active) assert.match(candidate.targetRevision, /^sha256:[a-f0-9]{64}$/);
    else
      assert.equal(
        candidate.targetRevision,
        "SELECT_CERTIFIED_CANDIDATE_DIGEST",
      );
    assert.deepEqual(Object.keys(candidate.helm).sort(), [
      "releaseName",
      "valueFiles",
    ]);
    assert.equal(candidate.helm.releaseName, "fieldsignal");
    assert.deepEqual(candidate.helm.valueFiles, [
      `$config/environments/${environment}/values.yaml`,
    ]);
    assert.deepEqual(config, {
      repoURL: "https://github.com/RPJWeez/fieldsignal-deploy.git",
      targetRevision: "SELECT_REVIEWED_CONFIGURATION_COMMIT",
      ref: "config",
    });
    assert.equal(app.spec.destination.namespace, `fieldsignal-${environment}`);
    assert.equal(app.spec.syncPolicy.automated.selfHeal, true);
  });
}

test("application project cannot own cluster-scoped resources or infrastructure", () => {
  const project = read("bootstrap/project.yaml");
  assert.deepEqual(project.spec.clusterResourceWhitelist, []);
  assert.deepEqual(project.spec.namespaceResourceWhitelist, [
    { group: "apps", kind: "Deployment" },
    { group: "", kind: "Service" },
  ]);
});

test("candidate selections are explicit digest-pinned application compositions", () => {
  for (const entry of fs
    .readdirSync(path.join(root, "candidates"), { withFileTypes: true })
    .filter((e) => e.isDirectory())) {
    const chart = read(`candidates/${entry.name}/Chart.yaml`);
    const values = read(`candidates/${entry.name}/values.yaml`);
    assert.equal(chart.name, "fieldsignal");
    assert.equal(chart.version, entry.name);
    assert.equal(chart.dependencies.length, 1);
    assert.equal(chart.dependencies[0].alias, "application");
    assert.equal(
      chart.dependencies[0].repository,
      "oci://ghcr.io/rpjweez/charts",
    );
    assert.match(chart.dependencies[0].version, /^\d+\.\d+\.\d+$/);
    assert.equal(values.application.releaseVersion, chart.version);
    const workloads = Object.values(values.application.workloads);
    assert(workloads.length > 0);
    for (const workload of workloads)
      assert.match(
        workload.image,
        /^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/,
      );
  }
});
