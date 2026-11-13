#!/usr/bin/env bash
# Use Grype's native database and JSON output. No suppression/rewrite engine.
set -euo pipefail
command -v grype >/dev/null
mkdir -p .work/security
while IFS= read -r image; do
  key=$(printf '%s' "$image" | sha256sum | cut -c1-16)
  grype "$image" --fail-on high --output json > ".work/security/$key.json"
done < .work/candidate/images.txt
node --input-type=module <<'JS'
import fs from 'node:fs';import {policyDigest} from './tools/evidence-policy.mjs';
const reports=fs.readdirSync('.work/security').sort().map(name=>JSON.parse(fs.readFileSync(`.work/security/${name}`)));
if(!reports.length)throw Error('security scan results missing');
fs.writeFileSync('.work/security.json',JSON.stringify({threshold:'high',result:'passed',reportDigest:policyDigest(JSON.stringify(reports)),reports},null,2));
JS
