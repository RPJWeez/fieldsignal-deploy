import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { parse, parseAllDocuments } from "yaml";
import Ajv from "ajv";
const [archive, valuesFile, namespace, releaseName = "fieldsignal"] =
  process.argv.slice(2);
const name = parse(
  execFileSync("helm", ["show", "chart", archive], { encoding: "utf8" }),
).name;
assert.match(name, /^[a-z][a-z0-9-]*$/);
const schema = JSON.parse(
  execFileSync("tar", ["-xOzf", archive, `${name}/environment.schema.json`], {
    encoding: "utf8",
  }),
);
const values = parse(fs.readFileSync(valuesFile, "utf8"));
const validate = new Ajv({ allErrors: true }).compile(schema);
assert(validate(values), JSON.stringify(validate.errors));
const expected = Object.values(
  JSON.parse(
    execFileSync("tar", ["-xOzf", archive, `${name}/build.json`], {
      encoding: "utf8",
    }),
  ).images,
);
const rendered = execFileSync(
  "helm",
  [
    "template",
    releaseName,
    archive,
    "-f",
    valuesFile,
    "--namespace",
    namespace,
  ],
  { encoding: "utf8" },
);
const images = [];
for (const doc of parseAllDocuments(rendered)) {
  const resource = doc.toJSON();
  if (!resource) continue;
  const pod =
    resource.kind === "CronJob"
      ? resource.spec.jobTemplate.spec.template.spec
      : resource.spec?.template?.spec;
  if (pod)
    images.push(
      ...[...(pod.containers || []), ...(pod.initContainers || [])].map(
        (c) => c.image,
      ),
    );
}
assert.deepEqual(
  [...new Set(images)].sort(),
  [...new Set(expected)].sort(),
  "configuration changed the candidate runtime image closure",
);
process.stdout.write(rendered);
