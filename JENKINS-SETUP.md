# Jenkins Setup

This project uses one Jenkins pipeline defined in `Jenkinsfile`.

## What the pipeline does

The pipeline runs these stages:

1. Setup frontend dependencies
2. Build frontend and run best-effort checks
3. Build Docker images
4. Start the app with Docker Compose and run smoke checks
5. Start or recreate Minikube
6. Load images into Minikube
7. Apply Kubernetes manifests from `k8s/`
8. Verify Kubernetes rollout
9. Prune unused image data

## Jenkins machine requirements

The Jenkins agent must have:

- Git
- Docker
- Node.js and npm
- Python
- Minikube
- kubectl

Quick check:

```bash
git --version
docker --version
npm --version
python --version
minikube version
kubectl version --client
```

## Create the job

Create a Jenkins Pipeline job with:

- Definition: `Pipeline script from SCM`
- SCM: `Git`
- Branch: `*/main`
- Script Path: `Jenkinsfile`

The pipeline already includes `githubPush()` as a trigger, so if Jenkins is reachable from GitHub, pushes can trigger builds automatically.

## What to expect

On a successful run:

- Docker Compose brings up the app on the Jenkins machine
- Frontend is available on `http://localhost:3000`
- Backend is available on `http://localhost:8000`
- Minikube is updated with the latest images
- Kubernetes resources in namespace `snapsure` are applied and verified

## Important runtime behavior

- The backend image is built with CPU-only PyTorch wheels.
- The backend model cache is not stored inside the image.
- Docker Compose uses a named volume for model cache.
- Kubernetes uses a Minikube hostPath cache at `/data/snapsure/model-cache`.

This reduces repeated image bloat and avoids re-downloading models on every container restart.

## Common failures

### Docker build fails

Check:

- Docker Desktop or Docker Engine is running
- the Jenkins user can access Docker

### Compose smoke check fails

Check:

- `docker compose logs backend`
- `docker compose logs frontend`

If the backend is starting for the first time, model download may take some time.

### Minikube start fails

Check:

- `minikube status`
- `kubectl cluster-info`

The pipeline recreates Minikube when it detects an unhealthy cluster.

### Kubernetes rollout fails

Check:

```bash
kubectl get pods -n snapsure
kubectl describe deployment backend -n snapsure
kubectl logs -l app=backend -n snapsure --tail=50
kubectl logs -l app=frontend -n snapsure --tail=50
```

## Notes

- The docs here only describe the current pipeline.
- If you change the Jenkinsfile, update this file with the same level of detail and no more.
- For Kubernetes manifest details, see [k8s/README-K8S.md](k8s/README-K8S.md).
- testing jenkins automation today
