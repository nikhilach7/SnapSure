# SnapSure — Deepfake Detection

SnapSure is a full-stack web application that classifies an uploaded image as **Real** or **Fake** using a PyTorch deep-learning model. The project is built and deployed with a complete DevOps pipeline.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind CSS |
| Backend | Flask 3 + Gunicorn (Python 3.12) |
| ML Model | PyTorch 2 + timm (Xception) |
| Containers | Docker + Docker Compose |
| CI/CD | Jenkins (declarative pipeline) |
| Orchestration | Kubernetes (Minikube) |

---

## Project Structure

```
SnapSure/
├── frontend/          # Next.js app (port 3000)
├── backend/           # Flask API  (port 8000)
├── models/            # PyTorch inference layer
├── weights/           # Model checkpoint (.pth)
├── docker/            # Dockerfiles
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── k8s/               # Kubernetes manifests
│   ├── 00-namespace.yaml
│   ├── 01-configmap.yaml
│   ├── 02-backend-deployment.yaml
│   ├── 03-frontend-deployment.yaml
│   ├── 04-services.yaml
│   ├── 05-ingress.yaml
│   └── deploy.sh
├── docker-compose.yml
├── Jenkinsfile
└── README.md
```

---

## Running with Docker Compose

```bash
# From project root
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

Verify backend health:

```bash
curl http://localhost:8000/health
```

Stop containers:

```bash
docker compose down
```

---

## API Reference

### `POST /predict`

Upload an image for deepfake detection.

- **Content-Type:** `multipart/form-data`
- **Field:** `file` (JPG / PNG / WEBP)

**Success response:**
```json
{ "result": "Real", "confidence": 0.9231 }
```

**Error response:**
```json
{ "error": "Unsupported file type" }
```

### `GET /health`

Returns backend status and loaded model name.

```json
{ "status": "ok", "model": "xception" }
```

---

## Jenkins CI/CD Pipeline

### Pipeline Overview

```
Code Push → Jenkins → Setup Deps → Build → Docker Build → Deploy + Smoke Test
```

### Stages

| Stage | What it does |
|---|---|
| 1. Setup Dependencies | `pip install` backend deps, `npm ci` frontend deps |
| 2. Validate + Build | `npm run build`, lint, backend pytest |
| 3. Build Docker Images | Builds `snapsure-backend` and `snapsure-frontend` images |
| 4. Deploy + Smoke Check | `docker compose up -d`, health check on `/health` and `/` |

Stage 4 runs only on the `main` branch.

### Create Jenkins Job

1. Open Jenkins → **New Item** → **Pipeline** → name it `SnapSure-Pipeline`
2. Under **Pipeline**, set:
   - **Definition:** Pipeline script from SCM
   - **SCM:** Git
   - **Repository URL:** your GitHub repo URL
   - **Branch:** `*/main`
   - **Script Path:** `Jenkinsfile`
3. Save and click **Build Now**

### Verify Docker Images After Build

```bash
docker images | grep snapsure
```

Expected output:
```
snapsure-frontend   <build>   ...
snapsure-backend    <build>   ...
```

---

## Kubernetes Deployment (Minikube)

### Prerequisites

```bash
# Install Minikube (Linux)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start cluster
minikube start
```

### Deploy (one command)

From project root:

```bash
bash k8s/deploy.sh
```

This script:
1. Points Docker to Minikube's daemon
2. Builds images inside Minikube
3. Applies all Kubernetes manifests
4. Waits for pods to be Ready
5. Prints pod and service status

### Manual Step-by-Step

```bash
# Point to Minikube's Docker daemon
eval $(minikube docker-env)

# Build images inside Minikube
docker build -f docker/backend.Dockerfile  -t snapsure-backend:latest  .
docker build -f docker/frontend.Dockerfile -t snapsure-frontend:latest .

# Apply manifests
kubectl apply -f k8s/

# Verify pods
kubectl get pods -n snapsure

# Verify services
kubectl get services -n snapsure
```

### Access the Application

```bash
minikube service frontend-service -n snapsure
```

This opens the app in your browser via the NodePort (30300).

Or access directly:

```bash
minikube ip   # get cluster IP
# Then open http://<minikube-ip>:30300
```

### Useful Commands

```bash
# Watch pods come up
kubectl get pods -n snapsure -w

# Check logs
kubectl logs -l app=backend  -n snapsure
kubectl logs -l app=frontend -n snapsure

# Describe a pod
kubectl describe pod -l app=backend -n snapsure

# Delete everything
kubectl delete namespace snapsure
```

---

## End-to-End DevOps Flow

```
GitHub Push
    ↓
Jenkins detects change (webhook or manual trigger)
    ↓
Stage 1: Install Python + Node dependencies
    ↓
Stage 2: Build Next.js app, run lint + tests
    ↓
Stage 3: docker build → snapsure-backend:latest
         docker build → snapsure-frontend:latest
    ↓
Stage 4: docker compose up -d
         curl /health  ← smoke test
    ↓
Kubernetes (Minikube): kubectl apply -f k8s/
    ↓
App accessible via NodePort 30300
```

---

## Local Development (without Docker)

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
PYTHONPATH=. python -m backend.app
# → http://localhost:8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

**Backend** (`backend/.env`):

| Variable | Default | Description |
|---|---|---|
| `MODEL_NAME` | `xception` | Model architecture |
| `MODEL_DEVICE` | `cpu` | `cpu` or `cuda` |
| `WEIGHTS_DIR` | `weights` | Path to `.pth` files |

**Frontend** (`frontend/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | Backend API URL |

---

## Notes

- Database is not used — the app performs stateless image inference.
- Model weights for Xception are included in `weights/`.
- All containers run as non-root users for security.
- Kubernetes health probes use `/health` (backend) and `/` (frontend).
