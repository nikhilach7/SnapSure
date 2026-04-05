# SnapSure Kubernetes Setup

This repo supports two local Kubernetes flows:

1. Docker Desktop Kubernetes on Windows
2. Minikube

Use Docker Desktop if you want the simplest setup. Use Minikube if you want a separate local cluster.

## What You Need

- Docker Desktop or Minikube
- `kubectl`
- Docker images for backend and frontend

## Manifest Flow

Apply these files in order:

```powershell
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-backend-deployment.yaml
kubectl apply -f k8s/03-frontend-deployment.yaml
kubectl apply -f k8s/04-services.yaml
kubectl apply -f k8s/05-ingress.yaml
```

Or apply the whole folder:

```powershell
kubectl apply -f k8s
```

Do not run `kubectl apply -f .` from the repo root, because it also picks up `docker-compose.yml`.

## Docker Desktop Flow

### 1. Enable Kubernetes

Open Docker Desktop > Settings > Kubernetes > Enable Kubernetes > Apply and Restart.

### 2. Build Images

From the project root:

```powershell
docker build -f docker/backend.Dockerfile -t snapsure-backend:latest .
docker build -f docker/frontend.Dockerfile -t snapsure-frontend:latest .
```

### 3. Deploy

```powershell
kubectl apply -f k8s
kubectl get pods -n snapsure
```

### 4. Open the App

```powershell
kubectl port-forward -n snapsure svc/frontend-service 3000:3000
```

Open http://localhost:3000

### Docker Desktop Notes

- The frontend service is ClusterIP, so port-forward is the simplest way to access it.
- Backend weights are mounted from:

```text
/run/desktop/mnt/host/c/Users/Akhila/OneDrive/Desktop/sample projects/SnapSure/weights
```

- If your project folder is different, update `hostPath.path` in `k8s/02-backend-deployment.yaml`.

## Minikube Flow

### 1. Start Minikube

```powershell
minikube start
minikube addons enable ingress
```

### 2. Build Images

```powershell
docker build -f docker/backend.Dockerfile -t snapsure-backend:latest .
docker build -f docker/frontend.Dockerfile -t snapsure-frontend:latest .
```

### 3. Mount Weights

```powershell
minikube mount C:\path\to\SnapSure\weights:/tmp/snapsure-weights
```

### 4. Deploy

```powershell
kubectl apply -f k8s
kubectl get pods -n snapsure
```

### 5. Open the App

Use ingress or port-forward:

```powershell
kubectl port-forward -n snapsure svc/frontend-service 3000:3000
```

Open http://localhost:3000

## Quick Checks

```powershell
kubectl get all -n snapsure
kubectl logs -f -n snapsure deployment/backend
kubectl logs -f -n snapsure deployment/frontend
```

## If Backend Stays Pending

Check the weights mount:

```powershell
kubectl describe pod -n snapsure <backend-pod-name>
```

If the path is wrong, fix `k8s/02-backend-deployment.yaml` and re-apply the backend deployment.

## Clean Up

```powershell
kubectl delete namespace snapsure
```
