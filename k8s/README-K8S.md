# Kubernetes Setup

This folder contains the Minikube deployment for SnapSure.

## Files

- `00-namespace.yaml`: creates namespace `snapsure`
- `01-configmap.yaml`: backend and frontend environment values
- `02-backend-deployment.yaml`: backend deployment
- `03-frontend-deployment.yaml`: frontend deployment
- `04-services.yaml`: backend ClusterIP and frontend NodePort
- `05-ingress.yaml`: optional ingress for `snapsure.local`
- `deploy.ps1`: Windows helper
- `deploy.sh`: shell helper

## Current behavior

The Kubernetes setup is for local Minikube use.

Important points:

- backend image: `snapsure-backend:latest`
- frontend image: `snapsure-frontend:latest`
- both deployments use `imagePullPolicy: Never`
- frontend service is exposed on NodePort `30300`
- backend service stays internal as `backend-service:8000`

## Backend model cache

The backend pod mounts persistent cache storage at:

- `/home/appuser/.cache`

That storage is backed by:

- hostPath `/data/snapsure/model-cache`

This is used for:

- Hugging Face model cache
- Torch cache

Result:

- first startup downloads the models
- later pod restarts reuse the cache
- model weights are not stored in the image itself

## Backend runtime settings

`01-configmap.yaml` sets:

- `MODEL_DEVICE=cpu`
- `DEMO_MODE=false`
- `HF_HOME=/home/appuser/.cache/huggingface`
- `TORCH_HOME=/home/appuser/.cache/torch`
- `XDG_CACHE_HOME=/home/appuser/.cache`

`02-backend-deployment.yaml` also includes:

- an init container to prepare cache directory permissions
- a startup probe for slow first-time model download
- liveness and readiness probes on `/health`

## Manual deploy

Start Minikube:

```bash
minikube start --driver=docker --container-runtime=docker
```

Apply manifests:

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-backend-deployment.yaml
kubectl apply -f k8s/03-frontend-deployment.yaml
kubectl apply -f k8s/04-services.yaml
kubectl apply -f k8s/05-ingress.yaml
```

Wait for rollout:

```bash
kubectl rollout status deployment/backend -n snapsure --timeout=10m
kubectl rollout status deployment/frontend -n snapsure --timeout=10m
```

## Access the app

Get the Minikube IP:

```bash
minikube ip
```

Open:

- `http://<minikube-ip>:30300`

For backend access from your machine:

```bash
kubectl port-forward svc/backend-service -n snapsure 8000:8000
```

Then open:

- `http://localhost:8000/health`

## Useful commands

Check resources:

```bash
kubectl get all -n snapsure
kubectl get pods -n snapsure -o wide
kubectl get services -n snapsure
```

Check logs:

```bash
kubectl logs -l app=backend -n snapsure --tail=50
kubectl logs -l app=frontend -n snapsure --tail=50
```

Restart deployments:

```bash
kubectl rollout restart deployment/backend -n snapsure
kubectl rollout restart deployment/frontend -n snapsure
```

## Cleanup

Delete the app:

```bash
kubectl delete namespace snapsure
```

Stop Minikube:

```bash
minikube stop
```

Delete the cluster:

```bash
minikube delete
```

## Notes

- If you delete the full Minikube cluster, the hostPath model cache is deleted with it.
- On the next fresh cluster start, the backend will download the models again.
- These docs describe the current manifests only. They are intentionally short.
