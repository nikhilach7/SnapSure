#!/usr/bin/env bash
# Deploy SnapSure to Minikube
set -e

echo "=== SnapSure Kubernetes Deployment ==="

# Build Docker images inside Minikube's Docker daemon
echo "[1/5] Pointing to Minikube Docker daemon..."
eval $(minikube docker-env)

echo "[2/5] Building Docker images..."
docker build -f docker/backend.Dockerfile  -t snapsure-backend:latest  .
docker build -f docker/frontend.Dockerfile -t snapsure-frontend:latest .

echo "[3/5] Applying Kubernetes manifests..."
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-backend-deployment.yaml
kubectl apply -f k8s/03-frontend-deployment.yaml
kubectl apply -f k8s/04-services.yaml
kubectl apply -f k8s/05-ingress.yaml

echo "[4/5] Waiting for pods to be Ready..."
kubectl rollout status deployment/backend  -n snapsure --timeout=120s
kubectl rollout status deployment/frontend -n snapsure --timeout=120s

echo "[5/5] Current status:"
kubectl get pods     -n snapsure
kubectl get services -n snapsure

echo ""
echo "=== Access the app ==="
echo "Run:  minikube service frontend-service -n snapsure"
