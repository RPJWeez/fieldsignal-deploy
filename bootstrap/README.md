# Local GitOps bootstrap

Use a disposable local cluster. Argo CD 3.6.1 is pinned to source commit 94037c4d4e1af4bd0651d37a179fbd9e347e668c; native OCI sources support digest-pinned Helm candidates.

```sh
kind create cluster --name fieldsignal-demo --kubeconfig /tmp/fieldsignal-demo.kubeconfig
export KUBECONFIG=/tmp/fieldsignal-demo.kubeconfig
kubectl create namespace argocd
kubectl apply --server-side -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/94037c4d4e1af4bd0651d37a179fbd9e347e668c/manifests/core-install.yaml
kubectl apply -f bootstrap/project.yaml
```

Provision the selected environment namespace and local PostgreSQL/Kafka/test secret from infra/qualification/dependencies.yaml in the pinned source repository. Wait for topic initialization. These fixtures belong to platform setup, outside application ownership, and are not production infrastructure.

After qualification, copy the desired application.yaml.example to application.yaml, replace SELECT_QUALIFIED_CANDIDATE_DIGEST with the qualified sha256 digest and submit a promotion PR. CI verifies evidence and renders the environment.

```sh
kubectl apply -f environments/production/application.yaml
kubectl get application fieldsignal-production -n argocd
kubectl wait -n argocd --for=jsonpath='{.status.health.status}'=Healthy application/fieldsignal-production --timeout=300s
```

Run only the environments needed for the demonstration. Each has its own namespace and a single complete-application Argo Application. Local resource usage increases with each additional environment.

```sh
kind delete cluster --name fieldsignal-demo
```

Public GitHub Actions cannot automatically inspect your private local cluster. Observe health locally before the next promotion. A production deployment-status integration is separate work; a successful Git merge must not be presented as proof of a healthy live deployment.
