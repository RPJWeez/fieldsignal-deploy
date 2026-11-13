import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { validateApplication } from "../tools/application-policy.mjs";
const fixture = () => {
  const app = parse(
    readFileSync(
      new URL(
        "../environments/production/application.yaml.example",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  app.spec.sources[0].targetRevision = `sha256:${"a".repeat(64)}`;
  app.spec.sources[1].targetRevision = "b".repeat(40);
  return app;
};
test("immutable pair allows a retained rollback and configuration-only promotion", () => {
  const app = fixture();
  assert.equal(
    validateApplication(app, "production").configuration,
    "b".repeat(40),
  );
  app.spec.sources[1].targetRevision = "c".repeat(40);
  assert.equal(
    validateApplication(app, "production").configuration,
    "c".repeat(40),
  );
});
for (const [name, mutate] of [
  ["moving config", (a) => (a.spec.sources[1].targetRevision = "main")],
  ["moving candidate", (a) => (a.spec.sources[0].targetRevision = "latest")],
  [
    "parameters",
    (a) =>
      (a.spec.sources[0].helm.parameters = [
        { name: "workloads.api.image", value: "evil" },
      ]),
  ],
  ["values", (a) => (a.spec.sources[0].helm.values = "workloads: {}")],
  ["valuesObject", (a) => (a.spec.sources[0].helm.valuesObject = {})],
  [
    "extra values",
    (a) => a.spec.sources[0].helm.valueFiles.push("$config/override.yaml"),
  ],
  ["extra source", (a) => a.spec.sources.push(a.spec.sources[1])],
  ["alternate source", (a) => (a.spec.source = {})],
  ["config path", (a) => (a.spec.sources[1].path = ".")],
])
  test(`reject ${name}`, () => {
    const app = fixture();
    mutate(app);
    assert.throws(() => validateApplication(app, "production"));
  });
