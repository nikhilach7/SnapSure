#!/usr/bin/env powershell
# SnapSure Kubernetes Deployment Script
# Run this from project root: ./k8s/deploy.ps1

param(
    [ValidateSet("deploy", "deploy-minikube", "delete", "status", "logs-backend", "logs-frontend")]
    [string]$Action = "status"
)

$NAMESPACE = "snapsure"
$K8S_DIR = ".\k8s"

function Show-Usage {
    Write-Host "Usage: ./k8s/deploy.ps1 [action]"
    Write-Host ""
    Write-Host "Actions:"
    Write-Host "  deploy          - Deploy all Kubernetes manifests"
    Write-Host "  deploy-minikube - Build images inside Minikube and deploy"
    Write-Host "  delete          - Delete entire snapsure namespace"
    Write-Host "  status          - Show deployment status"
    Write-Host "  logs-backend    - Stream backend logs"
    Write-Host "  logs-frontend   - Stream frontend logs"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  ./k8s/deploy.ps1 deploy"
    Write-Host "  ./k8s/deploy.ps1 logs-backend"
}

function Deploy {
    Write-Host "Deploying SnapSure to Kubernetes..." -ForegroundColor Green
    Write-Host ""
    
    if (!(Test-Path $K8S_DIR)) {
        Write-Host "Error: k8s folder not found at $K8S_DIR" -ForegroundColor Red
        exit 1
    }

    # Apply manifests in order
    Get-ChildItem $K8S_DIR -Filter "*.yaml" | Sort-Object | ForEach-Object {
        Write-Host "Applying $_" -ForegroundColor Cyan
        kubectl apply -f $_.FullName
    }

    Write-Host ""
    Write-Host "Deployment submitted!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Wait for pods to be ready: ./k8s/deploy.ps1 status"
    Write-Host "2. Check logs: ./k8s/deploy.ps1 logs-backend"
    Write-Host "3. Access frontend: http://localhost:3000"
}

function DeployMinikube {
    Write-Host "Building images inside Minikube and deploying SnapSure..." -ForegroundColor Green
    Write-Host ""

    & minikube -p minikube docker-env --shell powershell | Invoke-Expression

    Write-Host "Building backend image..." -ForegroundColor Cyan
    docker build -f docker/backend.Dockerfile -t snapsure-backend:latest .

    Write-Host "Building frontend image..." -ForegroundColor Cyan
    docker build -f docker/frontend.Dockerfile -t snapsure-frontend:latest .

    Write-Host ""
    Deploy
}

function Delete {
    Write-Host "Deleting SnapSure namespace..." -ForegroundColor Red
    kubectl delete namespace $NAMESPACE
    Write-Host "Deleted!" -ForegroundColor Green
}

function Status {
    Write-Host "Deployment Status" -ForegroundColor Cyan
    Write-Host ""
    kubectl get all -n $NAMESPACE
}

function LogsBackend {
    Write-Host "Backend Logs (streaming)..." -ForegroundColor Cyan
    kubectl logs -f -n $NAMESPACE deployment/backend
}

function LogsFrontend {
    Write-Host "Frontend Logs (streaming)..." -ForegroundColor Cyan
    kubectl logs -f -n $NAMESPACE deployment/frontend
}

# Main
switch ($Action) {
    "deploy" { Deploy }
    "deploy-minikube" { DeployMinikube }
    "delete" { Delete }
    "status" { Status }
    "logs-backend" { LogsBackend }
    "logs-frontend" { LogsFrontend }
    default { Show-Usage }
}
