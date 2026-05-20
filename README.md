# SnapSure

SnapSure is a local deepfake detection app with:

- `frontend/`: Next.js frontend on port `3000`
- `backend/`: Flask API on port `8000`
- `models/`: inference code for the ensemble detector
- `docker/`: backend and frontend Dockerfiles
- `k8s/`: Kubernetes manifests for Minikube
- `Jenkinsfile`: Jenkins pipeline for local Docker and Minikube deployment

## What it does

The backend loads two Hugging Face image-classification models:

- `Wvolf/ViT_Deepfake_Detection`
- `dima806/deepfake_vs_real_image_detection`

It averages the fake probability from both models and returns:

- `overall_label`
- `overall_confidence`
- `fake_score`
- `num_faces`

Face detection uses MTCNN. Face count is returned in the response, but face detection is not used to make the REAL/FAKE decision.

## API

### `GET /health`

Returns:

```json
{ "status": "ok", "model": "ensemble" }
```

If `DEMO_MODE=true`, it returns:

```json
{ "status": "ok", "model": "demo" }
```

### `POST /predict`

Send `multipart/form-data` with a `file` field.

Supported file types:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

Example success response:

```json
{
  "overall_label": "REAL",
  "overall_confidence": 0.8765,
  "fake_score": 0.1235,
  "num_faces": 1,
  "faces": []
}
```

## Run with Docker Compose

From the repo root:

```bash
docker compose up --build
```

App URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

Stop it with:

```bash
docker compose down
```

### Model cache

The backend container stores Hugging Face and Torch cache in a named Docker volume:

- `backend-model-cache`

This means:

- the models are downloaded on the first run
- later restarts reuse the cache
- the model weights are not baked into the backend image

## Run locally without Docker

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
set PYTHONPATH=.
python -m backend.app
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment

Backend environment values are read from:

- `backend/.env`
- `backend/.env.docker`

Main backend variables:

- `MODEL_DEVICE=cpu`
- `DEMO_MODE=false`

The Docker and Kubernetes setups also set:

- `HF_HOME`
- `TORCH_HOME`
- `XDG_CACHE_HOME`

These keep downloaded model files in a persistent cache path.

## Docker image note

The backend image now uses CPU-only PyTorch wheels and excludes local virtualenv folders from the build context. That keeps the backend image much smaller than the earlier CUDA-heavy build.

## Kubernetes and Jenkins

For Minikube deployment:

- see [k8s/README-K8S.md](k8s/README-K8S.md)

For Jenkins setup:

- see [JENKINS-SETUP.md](JENKINS-SETUP.md)
