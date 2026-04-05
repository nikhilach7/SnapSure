# SnapSure Kubernetes Setup

This guide helps you run SnapSure on local Kubernetes.

You can use:

1. Docker Desktop Kubernetes (easy on Windows)
2. Minikube

## Prerequisites

- `kubectl` installed
- Docker installed
- Kubernetes cluster running (Docker Desktop or Minikube)

## Build Images

From project root:

```powershell
docker build -f docker/backend.Dockerfile -t snapsure-backend:latest .
docker build -f docker/frontend.Dockerfile -t snapsure-frontend:latest .
```

## Deploy Manifests

Apply all files:

```powershell
kubectl apply -f k8s
```

Check pods:

```powershell
kubectl get pods -n snapsure
```

Do not run `kubectl apply -f .` from repo root.

## Access App

Use port-forward:

```powershell
kubectl port-forward -n snapsure svc/frontend-service 3000:3000
```

Open `http://localhost:3000`.

## Important: Weights Path

Backend pod needs the `weights/` folder.

Check `hostPath.path` in `k8s/02-backend-deployment.yaml` and set it to your local absolute path.

Example (Windows style):

```text
C:\Users\<your-user>\Desktop\SnapSure\weights
```

If this path is wrong, backend may fail to start.

## Minikube Note

If you use Minikube, make sure your `weights/` folder is available to the cluster (mount or copy, based on your setup).

## Useful Commands

```powershell
kubectl get all -n snapsure
kubectl logs -f -n snapsure deployment/backend
kubectl logs -f -n snapsure deployment/frontend
kubectl describe pod -n snapsure <backend-pod-name>
```

## Cleanup

```powershell
kubectl delete namespace snapsure
```
