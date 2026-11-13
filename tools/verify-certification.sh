#!/usr/bin/env bash
set -euo pipefail
reference=${REFERENCE:?}
policy=${POLICY_FILE:-policy.json}
workflow=$(jq -er .certificationWorkflow "$policy")
repository=${workflow%/.github/workflows/*}
mkdir -p .work
# Signature verification is performed here, before payload validation.
gh attestation verify "oci://$reference" --repo "$repository" --signer-workflow "$workflow" --source-ref refs/heads/main --predicate-type "$(jq -er .certificationPredicate "$policy")" --format json > .work/verified-certification.json
node --input-type=module <<'JS'
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {certifiedEvidence,policyDigest} from './tools/evidence-policy.mjs';
const bytes=fs.readFileSync(process.env.POLICY_FILE||'policy.json');
const decision=certifiedEvidence(JSON.parse(fs.readFileSync('.work/verified-certification.json')),process.env.REFERENCE,JSON.parse(bytes),policyDigest(bytes));
const policy=JSON.parse(bytes);
execFileSync('node',['tools/verify-run.mjs',JSON.stringify({repository:policy.certificationWorkflow.split('/.github/')[0],run:decision.run,attempt:decision.attempt,source:decision.workflowRevision,event:'workflow_dispatch',workflow:'.github/workflows/certify.yml'})],{stdio:'inherit'});
JS
