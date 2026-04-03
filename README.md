# SnapSure

Production-oriented monorepo for classifying uploaded images as **Real** or **Fake** using pretrained deepfake detection models.

## What SnapSure does

- Provides a multi-page Next.js frontend for product-style user experience
- Sends the file to a Flask backend inference API
- Runs prediction with a PyTorch model
- Returns a clean result: `Real` or `Fake`

This system detects visual manipulation artifacts only. It does **not** perform identity recognition or determine whether a person exists in the real world.

## Monorepo Structure

```text
project-root/
  frontend/                # Next.js (App Router) UI + API proxy route
  backend/                 # Flask REST API
  models/                  # Shared model loading + inference abstraction
  weights/                 # Place .pth checkpoints here
  docker/                  # Dockerfiles
  docker-compose.yml
  README.md
```

## Frontend Pages

- `/` - Home page with live image upload and inference results
- `/architecture` - Engineering system design and stack flow
- `/playbook` - Operational runbook and incident guidance
- `/about` - Product mission and principles

## Environment Files

This project includes environment templates for both local and Docker workflows:

- `backend/.env.example` -> local backend settings
- `frontend/.env.example` -> local frontend settings
- `backend/.env.docker` -> Docker backend settings
- `frontend/.env.docker` -> Docker frontend settings

Local setup copies:

```bash
# Windows CMD (from project root)
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

```bash
# macOS/Linux (from project root)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Model Strategy

- Default model: `xception`
- Backup model: `efficientnet_b4`
- Model choice is controlled by environment variable `MODEL_NAME`

Supported weight file names (inside `weights/`):

- `xception_deepfake.pth`
- `efficientnet_b4_deepfake.pth`

## Pretrained Weights

This repository includes one ready-to-run checkpoint:

- `weights/xception_deepfake.pth`

If users need another model (for example `efficientnet_b4`), they must download the checkpoint from the internet and place it inside the `weights/` folder.

Sources you can use:

- FaceForensics++ related model releases
- DeepfakeBench model zoo
- Papers with official checkpoint links for Xception/EfficientNet deepfake detection

Place downloaded files in:

- `weights/xception_deepfake.pth`
- `weights/efficientnet_b4_deepfake.pth`

If `MODEL_NAME=efficientnet_b4`, then `weights/efficientnet_b4_deepfake.pth` must exist.

## Local Development

### 1) Create local env files

Windows CMD (from project root):

```bat
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

macOS/Linux (from project root):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2) Backend (Flask + PyTorch)

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Run backend from repository root (important for shared `models/` import):

```bat
REM from project root (Windows CMD)
cd ..
set PYTHONPATH=.
python -m backend.app
```

```bash
# from project root (macOS/Linux)
cd ..
PYTHONPATH=. python -m backend.app
```


`backend/.env` is loaded automatically by the Flask app.

Backend API is available at `http://localhost:8000`.

### 3) Frontend (Next.js)

```bash
cd frontend
npm install
```

Run frontend:

```bat
REM Windows CMD (from project root)
cd frontend
npm run dev
```

```bash
# macOS/Linux (from project root)
cd frontend
npm run dev
```

Frontend runs at `http://localhost:3000`.

Main routes:

- `http://localhost:3000/`
- `http://localhost:3000/architecture`
- `http://localhost:3000/playbook`
- `http://localhost:3000/about`

## Docker Run

From repository root:

```bash
docker compose up --build
```

Docker reads service env files automatically:

- `backend/.env.docker`
- `frontend/.env.docker`

If needed, edit those files before starting compose.

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## API Contract

### POST `/predict`

- Content-Type: `multipart/form-data`
- Field: `file` (image)

Success response:

```json
{
  "result": "Real",
  "confidence": 0.9231
}
```

Error response example:

```json
{
  "error": "Unsupported file type"
}
```

## Switching Models

Update `MODEL_NAME` inside `backend/.env`:

```env
MODEL_NAME=xception
# or
MODEL_NAME=efficientnet_b4
```

Then restart the backend service.

No code changes are needed. The backend model registry handles architecture and expected weight file mapping.

## Notes on Production Hardening

- Add authentication/rate limiting if the API is exposed publicly
- Enable observability (structured logs + metrics)
- Move model weights to object storage and mount/read at runtime
- Consider GPU runtime and `MODEL_DEVICE=cuda` if available
