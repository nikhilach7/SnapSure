# SnapSure Kubernetes Setup

This guide runs SnapSure on local Kubernetes with Minikube on Windows.

## What This Deployment Does

- Creates the `snapsure` namespace
- Starts the backend and frontend as Kubernetes Deployments
- Exposes the backend with a ClusterIP Service and the frontend with a NodePort Service
- Includes an optional NGINX Ingress manifest
- Runs the backend in demo mode by default so the cluster does not need a separate weights mount

## Prerequisites

- Docker Desktop installed and running
- `kubectl` installed
- `minikube` installed
- A local Kubernetes cluster created with Minikube

## Windows Setup From Scratch

If you do not already have `kubectl` or `minikube`, install them on Windows first.

### 1) Install Docker Desktop

Download and install Docker Desktop from the official Docker website, then start it once and make sure it is running in the system tray.

### 2) Install `kubectl`

The easiest options on Windows are `winget` or Chocolatey.

```powershell
winget install -e --id Kubernetes.kubectl
```

If you use Chocolatey:

```powershell
choco install kubernetes-cli
```

Verify the install:

```powershell
kubectl version --client
```

If PowerShell says the command is not found, open a new terminal window so PATH updates load.

### 3) Install Minikube

Install Minikube with `winget` or Chocolatey:

```powershell
winget install -e --id Kubernetes.minikube
```

Or:

```powershell
choco install minikube
```

Verify it:

```powershell
minikube version
```

### 4) Start the local cluster

Start Minikube after Docker Desktop is running:

```powershell
minikube start --driver=docker
```

This creates your local Kubernetes cluster on Windows.

### 5) Check that everything is ready

```powershell
kubectl get nodes
kubectl cluster-info
```

You should see one Minikube node in a `Ready` state.

## Start Minikube After Installation

```powershell
minikube start
```

If you already started Minikube in the setup section above, you can skip this step.

If you want to use the Ingress manifest, also enable the ingress addon:

```powershell
minikube addons enable ingress
```

## Build Images for Minikube

Use the PowerShell helper from the repository root:

```powershell
./k8s/deploy.ps1 deploy-minikube
```

This command:

1. Points Docker to the Minikube daemon
2. Builds `snapsure-backend:latest` and `snapsure-frontend:latest`
3. Applies all manifests in `k8s/`
4. Waits for both Deployments to roll out


## Deploy Manifests Manually

If you want to apply files yourself, run them in this order:

```powershell
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-backend-deployment.yaml
kubectl apply -f k8s/03-frontend-deployment.yaml
kubectl apply -f k8s/04-services.yaml
kubectl apply -f k8s/05-ingress.yaml
```

## Access the App

Fastest option with Minikube:

```powershell
minikube service frontend-service -n snapsure
```

That opens the NodePort service in your browser.

You can also port-forward:

```powershell
kubectl port-forward -n snapsure svc/frontend-service 3000:3000
```

Then open `http://localhost:3000`.

If you enabled ingress, add `snapsure.local` to your hosts file using the Minikube IP:

```powershell
minikube ip
```

Map that IP to `snapsure.local` and browse `http://snapsure.local`.

## Important Runtime Notes

- `DEMO_MODE: "true"` is set in `k8s/01-configmap.yaml`, so the backend skips model initialization and returns demo predictions.
- There is no `weights/` hostPath mount in the manifests.
- If you want real Hugging Face model inference in Kubernetes, set `DEMO_MODE` to `"false"` and increase the backend memory limits.

## Useful Commands

```powershell
kubectl get all -n snapsure
kubectl logs -f -n snapsure deployment/backend
kubectl logs -f -n snapsure deployment/frontend
kubectl describe pod -n snapsure -l app=backend
kubectl describe pod -n snapsure -l app=frontend
```

## Cleanup

```powershell
kubectl delete namespace snapsure
```
