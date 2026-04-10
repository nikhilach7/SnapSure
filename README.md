# SnapSure — Deepfake Detection

SnapSure is a full-stack web application that classifies an uploaded image as **Real** or **Fake** using an ensemble of two state-of-the-art deepfake detection models. The project is built and deployed with a complete DevOps pipeline.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind CSS |
| Backend | Flask 3 + Gunicorn (Python 3.11) |
| ML Model | PyTorch 2 + Hugging Face Transformers + Ensemble |
| Models | ViT Deepfake Detection + Deepfake vs Real Image Detection |
| Face Detection | MTCNN (facenet-pytorch) |
| Containers | Docker + Docker Compose |
| CI/CD | Jenkins (declarative pipeline) |
| Orchestration | Kubernetes (Minikube) |

---

## Model Architecture

SnapSure uses an **ensemble approach** with two pretrained models from Hugging Face:

1. **Wvolf/ViT_Deepfake_Detection** - Vision Transformer-based deepfake detector
2. **dima806/deepfake_vs_real_image_detection** - Specialized deepfake vs real image classifier

### How It Works

1. **Image Processing**: The full image is analyzed (no face cropping for classification)
2. **Ensemble Inference**: Both models run inference independently
3. **Probability Extraction**: FAKE class probability is extracted from each model's logits
4. **Score Averaging**: `avg_fake_score = (score1 + score2) / 2`
5. **Decision Logic**:
   - If `avg_fake_score >= 0.5` → **FAKE**
   - Else → **REAL**
6. **Confidence Calculation**:
   - If FAKE: `confidence = avg_fake_score`
   - If REAL: `confidence = 1 - avg_fake_score`
7. **Face Detection** (secondary): MTCNN counts faces and optionally returns cropped face images

### Face Detection

Face detection is performed using MTCNN but is **not used** for the deepfake classification decision. It's provided for:
- Counting the number of faces in the image
- Optionally returning cropped face images for further analysis

---

## Project Structure

```
SnapSure/
├── frontend/          # Next.js app (port 3000)
├── backend/           # Flask API  (port 8000)
├── models/            # PyTorch inference layer (ensemble)
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

## Quick Start

### Using Docker Compose (Recommended)

```bash
# From project root
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

**Note:** By default, Docker Compose runs in demo mode (`DEMO_MODE=true`) to avoid downloading large models. To use the actual ensemble models, set `DEMO_MODE=false` in `backend/.env.docker`.

### Using Docker Compose with Real Models

```bash
# Edit backend/.env.docker and set DEMO_MODE=false
# Then run:
docker compose up --build
```

The first run will download the ensemble models from Hugging Face (may take 1-2 minutes).

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
{
  "overall_label": "REAL",
  "overall_confidence": 0.8765,
  "fake_score": 0.1235,
  "num_faces": 1,
  "faces": []
}
```

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `overall_label` | string | Final classification: "REAL" or "FAKE" |
| `overall_confidence` | float | Confidence score (0.0 to 1.0), rounded to 4 decimal places |
| `fake_score` | float | Average FAKE probability from ensemble (0.0 to 1.0) |
| `num_faces` | int | Number of faces detected in the image |
| `faces` | array | Array of cropped face images (empty by default) |

**Error response:**
```json
{ "error": "Unsupported file type" }
```

### `GET /health`

Returns backend status and loaded model information.

```json
{ "status": "ok", "model": "ensemble" }
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
| 4. Deploy + Smoke Check | `docker compose up -d`, health check on `/health` and `/` (models auto-download from Hugging Face) |

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

### Prerequisites

- Python 3.11+
- Node.js 18+
- Internet connection (for Hugging Face model download on first run)

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
PYTHONPATH=. python -m backend.app
# → http://localhost:8000
```

**Note:** On first run, the ensemble models will be automatically downloaded from Hugging Face. This may take a few minutes depending on your internet connection.

### Frontend Setup

```bash
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
| `MODEL_DEVICE` | `cpu` | Device for model inference: `cpu` or `cuda` |
| `DEMO_MODE` | `false` | If `true`, returns dummy predictions without loading models |

**Frontend** (`frontend/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8000` | Backend API URL |

**Docker Compose** (`backend/.env.docker`):

| Variable | Default | Description |
|---|---|---|
| `MODEL_DEVICE` | `cpu` | Device for model inference |
| `DEMO_MODE` | `true` | Enabled by default for Docker Compose to avoid model downloads in demo mode |

---

## Notes

- Database is not used — the app performs stateless image inference.
- Models are automatically downloaded from Hugging Face on first run (cached locally in `~/.cache/huggingface`).
- The ensemble uses lazy singleton pattern — models are loaded once and reused across requests.
- Face detection is performed using MTCNN but is not used for the deepfake classification decision.
- All containers run as non-root users for security.
- Kubernetes health probes use `/health` (backend) and `/` (frontend).
- First startup may take 1-2 minutes for model download and initialization.
- For production deployments, set `DEMO_MODE=false` in environment variables.

---

## Model Performance

### Expected Behavior

- **First Run**: 1-2 minutes for model download from Hugging Face
- **Subsequent Runs**: Models are cached locally (~2-3 seconds startup)
- **Inference Time**: 2-5 seconds per image (CPU), faster with GPU
- **Memory Usage**: ~2-3 GB RAM for both models (CPU mode)

### Model Cache Location

Models are cached in:
- Linux/Mac: `~/.cache/huggingface/hub/`
- Windows: `C:\Users\<username>\.cache\huggingface\hub\`

To clear cache and force re-download:
```bash
# Linux/Mac
rm -rf ~/.cache/huggingface/hub/

# Windows
Remove-Item -Recurse -Force $env:USERPROFILE\.cache\huggingface\hub\
```

---

## Troubleshooting

### Backend fails to start with "Failed to load models"

**Cause:** Network issues preventing Hugging Face model download

**Solution:**
1. Check internet connection
2. Verify Hugging Face is accessible: `curl https://huggingface.co`
3. Check firewall/proxy settings
4. Try manually downloading models or use `DEMO_MODE=true` for testing

### Health check fails in Docker Compose

**Cause:** Model download taking longer than healthcheck timeout

**Solution:**
1. Increase `start_period` in `docker-compose.yml` (currently 120s)
2. Check backend logs: `docker compose logs backend`
3. Set `DEMO_MODE=true` for quick testing without models

### Out of memory errors

**Cause:** Insufficient RAM for ensemble models

**Solution:**
1. Reduce to single model (modify `models/model.py`)
2. Use GPU with `MODEL_DEVICE=cuda` (if available)
3. Increase system RAM or use a larger instance

### Slow inference on CPU

**Cause:** Ensemble models running on CPU

**Solution:**
1. Use GPU if available: Set `MODEL_DEVICE=cuda` in environment
2. Ensure CUDA drivers are installed
3. Consider using a smaller model for faster inference
