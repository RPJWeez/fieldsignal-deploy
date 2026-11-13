#!/usr/bin/env bash
# Read-only verification. REFERENCE must be supplied; never selects a latest run/tag.
set -euo pipefail
reference=${REFERENCE:?}
policy=${POLICY_FILE:-policy.json}
repository=$(jq -er .sourceRepository "$policy")
workflow=$(jq -er .sourceWorkflow "$policy")
source_ref=$(jq -er .sourceRef "$policy")
expected=$(jq -er .candidateRepository "$policy")
[[ "$reference" == "$expected"@sha256:* && "${reference##*@}" =~ ^sha256:[a-f0-9]{64}$ ]]
mkdir -p .work/candidate
# Authenticate chart identity before parsing its payload or checking out test code.
cosign verify "$reference" --certificate-identity="https://github.com/$workflow@$source_ref" --certificate-oidc-issuer=https://token.actions.githubusercontent.com > .work/candidate/signature.json
gh attestation verify "oci://$reference" --repo "$repository" --signer-workflow "$workflow" --source-ref "$source_ref" --predicate-type "$(jq -r .buildPredicate "$policy")" --format json > .work/candidate/verified-build.json
pull_directory=$(mktemp -d .work/pull.XXXXXX)
helm pull "oci://$reference" --destination "$pull_directory"
new_archive=$(find "$pull_directory" -maxdepth 1 -name '*.tgz' -print -quit)
[[ -n "$new_archive" ]]
archive=.work/candidate/chart.tgz
mv "$new_archive" "$archive"
name=$(helm show chart "$archive" | awk '/^name:/ {print $2}')
[[ "$name" =~ ^[a-z][a-z0-9-]*$ ]]
tar -xOzf "$archive" "$name/build.json" > .work/candidate/build.json
source_sha=$(jq -er .source .work/candidate/build.json)
[[ "$source_sha" =~ ^[a-f0-9]{40}$ ]]
# Do not trust source SHA from chart bytes alone: bind to authenticated provenance.
gh attestation verify "oci://$reference" --repo "$repository" --signer-workflow "$workflow" --source-ref "$source_ref" --source-digest "$source_sha" > /dev/null
gh attestation verify "$archive" --repo "$repository" --signer-workflow "$workflow" --source-ref "$source_ref" --source-digest "$source_sha" --predicate-type https://spdx.dev/Document > /dev/null
node --input-type=module <<'JS'
import fs from 'node:fs';import {isDeepStrictEqual} from 'node:util';import assert from 'node:assert/strict';
const build=JSON.parse(fs.readFileSync('.work/candidate/build.json'));
const policy=JSON.parse(fs.readFileSync(process.env.POLICY_FILE||'policy.json'));
const verified=JSON.parse(fs.readFileSync('.work/candidate/verified-build.json'));
assert.equal(build.repository,policy.sourceRepository);
assert.equal(build.workflow,`${policy.sourceWorkflow}@${policy.sourceRef}`);
assert(build.run && build.attempt && build.toolchain);
assert(Object.keys(build.images).length>0);
assert(verified.some(v=>isDeepStrictEqual(v.verificationResult?.statement?.predicate,build)), 'packaged build payload must equal signed build payload');
JS
expected_run=$(jq -c '{repository,run,attempt,source,event:"push",workflow:".github/workflows/ci.yml"}' .work/candidate/build.json)
node tools/verify-run.mjs "$expected_run"
jq -r '.images[]'  .work/candidate/build.json | sort -u > .work/candidate/images.txt
while IFS= read -r image; do
  [[ "$image" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
  cosign verify "$image" --certificate-identity="https://github.com/$workflow@$source_ref" --certificate-oidc-issuer=https://token.actions.githubusercontent.com > /dev/null
  gh attestation verify "oci://$image" --repo "$repository" --signer-workflow "$workflow" --source-ref "$source_ref" --source-digest "$source_sha" > /dev/null
  gh attestation verify "oci://$image" --repo "$repository" --signer-workflow "$workflow" --source-ref "$source_ref" --source-digest "$source_sha" --predicate-type https://spdx.dev/Document > /dev/null
done < .work/candidate/images.txt
helm show values "$archive" > .work/candidate/values.yaml
node --input-type=module <<'JS'
import fs from 'node:fs'; import assert from 'node:assert/strict'; import {parse} from 'yaml';
const values=parse(fs.readFileSync('.work/candidate/values.yaml','utf8'));
const expected=fs.readFileSync('.work/candidate/images.txt','utf8').trim().split('\n');
assert.deepEqual([...new Set(Object.values(values.application.workloads).map(w=>w.image))].sort(),expected,'runtime image inventory mismatch');
JS
printf '%s\n' "$source_sha" > .work/candidate/source-sha
