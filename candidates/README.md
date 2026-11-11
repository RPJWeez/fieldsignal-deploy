# Application candidates

Each candidates/<version>/ directory is a standard Helm wrapper chart: Chart.yaml, Chart.lock, values.yaml and a vendored shared-chart dependency. Select real published image digests in values.yaml. A changed selection requires a new candidate version.

Publication packages and signs the chart. Qualification deploys its OCI digest through one Argo Application and records signed functional-test evidence. Promotion updates an environment Application's OCI targetRevision; it does not rebuild components or copy/edit their image pins.

No fabricated digest is supplied by bootstrap. Initial environment Application files remain .example until a real qualified candidate exists.
