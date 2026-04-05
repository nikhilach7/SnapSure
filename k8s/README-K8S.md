# Kubernetes Setup for SnapSure (Local Development)

This folder contains Kubernetes manifests to deploy SnapSure on your local machine using **Minikube** or **Docker Desktop Kubernetes**.

## What each file does

| File | Purpose |
|------|---------|
| `00-namespace.yaml` | Creates a separate namespace called `snapsure` (keeps things organized) |
| `01-configmap.yaml` | Stores environment variables (MODEL_NAME, BACKEND_URL) |
| `02-backend-deployment.yaml` | Runs 2 copies of Flask backend with health checks |
| `03-frontend-deployment.yaml` | Runs 2 copies of Next.js frontend with health checks |
| `04-services.yaml` | Internal networking (backend-service, frontend-service) |
| `05-ingress.yaml` | Exposes frontend to your machine (snapsure.local) |

## Prerequisites

### Option 1: Minikube (Recommended for local)
```powershell
# Install Minikube from https://minikube.sigs.k8s.io/docs/start/

# Start Minikube
minikube start

# Enable ingress addon
minikube addons enable ingress

# Get Minikube IP
minikube ip
```

### Option 2: Docker Desktop Kubernetes
1. Open Docker Desktop > Settings > Kubernetes
2. Check "Enable Kubernetes"
3. Wait for it to start (green "Kubernetes is running")

## Setup steps

### 1. Build Docker images locally

From project root:
```powershell
# Build backend image
docker build -f docker/backend.Dockerfile -t snapsure-backend:latest .

# Build frontend image
docker build -f docker/frontend.Dockerfile -t snapsure-frontend:latest .
```

### 2. Prepare model weights directory

For Minikube:
```powershell
minikube mount C:\path\to\SnapSure\weights:/tmp/snapsure-weights
```

For Docker Desktop: weights will be auto-available at `/tmp/snapsure-weights`

### 3. Deploy to Kubernetes

From k8s folder:
```powershell
# Apply all manifests in order
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-backend-deployment.yaml
kubectl apply -f 03-frontend-deployment.yaml
kubectl apply -f 04-services.yaml
kubectl apply -f 05-ingress.yaml

# Or apply all at once
kubectl apply -f .
```

### 4. Verify deployment

```powershell
# Check all resources in snapsure namespace
kubectl get all -n snapsure

# Expected output:
# NAME                            READY   STATUS    RESTARTS   AGE
# pod/backend-xxx                 1/1     Running   0          10s
# pod/backend-yyy                 1/1     Running   0          10s
# pod/frontend-aaa                1/1     Running   0          10s
# pod/frontend-bbb                1/1     Running   0          10s

# Check pod logs
kubectl logs -n snapsure deployment/backend
kubectl logs -n snapsure deployment/frontend
```

### 5. Access the app

**For Minikube:**
```powershell
# Get Minikube IP
minikube ip
# Then visit: http://<minikube-ip>:80
# Or: Add entry in hosts file and visit http://snapsure.local
```

**For Docker Desktop:**
```powershell
# Visit: http://localhost:3000
# Or: http://localhost (via ingress)
```

## Common troubleshooting

### Pods stuck in "Pending"
```powershell
kubectl describe pod <pod-name> -n snapsure
# Usually: not enough resources or image not found
```

### Backend health check failing
```powershell
# Port-forward to test directly
kubectl port-forward -n snapsure svc/backend-service 8000:8000
# Visit: http://localhost:8000/health
```

### Frontend can't reach backend
```powershell
# Debug: exec into frontend pod and test
kubectl exec -it -n snapsure deployment/frontend -- sh
# Inside pod: curl http://backend-service:8000/health
```

### Weights directory not found
```powershell
# For Minikube: ensure mount is running
minikube mount C:\path\to\SnapSure\weights:/tmp/snapsure-weights

# For Docker Desktop: check weights are in C:\path\to\SnapSure\weights
```

## Useful kubectl commands

```powershell
# Watch real-time status
kubectl get pods -n snapsure --watch

# View detailed events
kubectl describe pod <pod-name> -n snapsure

# Stream logs from a pod
kubectl logs -f -n snapsure deployment/backend

# Port-forward to test service locally
kubectl port-forward -n snapsure svc/frontend-service 3000:3000

# Delete entire deployment
kubectl delete namespace snapsure
```

## Next steps

1. **Test the app:** Upload an image via http://snapsure.local (or localhost:3000)
2. **Scale up:** Edit replicas in deployment files, then re-apply
3. **Monitor:** Watch logs while testing
4. **Production:** Swap images to use container registry (Docker Hub, Azure Container Registry, etc.)

## Architecture diagram

```
┌─────────────────────────────────────────────┐
│         Your Machine                        │
│  ┌──────────────────────────────────────┐   │
│  │  Kubernetes (Minikube/Docker Desktop)│   │
│  │                                      │   │
│  │  Namespace: snapsure                │   │
│  │  ├─ Pod: frontend (replicas: 2)     │   │
│  │  ├─ Pod: backend (replicas: 2)      │   │
│  │  └─ Service, Ingress                │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Volumes:                                   │
│  └─ /tmp/snapsure-weights ← model .pth     │
│                                             │
└─────────────────────────────────────────────┘
```

---

**Need help?** Run any kubectl command with `-n snapsure` to scope to the namespace.
