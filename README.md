# SnapSure

SnapSure checks an uploaded image and returns one label:

- `Real`
- `Fake`

It is a full-stack project with:

- Next.js frontend
- Flask backend
- PyTorch model inference

## Project Structure

```text
SnapSure/
  frontend/                # Next.js app
  backend/                 # Flask API
  models/                  # Model loading code
  weights/                 # Model checkpoint files (.pth)
  docker/                  # Dockerfiles
  docker-compose.yml
  README.md
```

## Important Model Files

Included in this repo:

- `weights/xception_deepfake.pth`

Optional (only needed if you switch model):

- `weights/efficientnet_b4_deepfake.pth`

Default model is `xception`.

If you set `MODEL_NAME=efficientnet_b4`, you must add `weights/efficientnet_b4_deepfake.pth` manually.

## Quick Start (Local)

Run all commands from project root unless told otherwise.

### 1) Create env files

Windows CMD:

```bat
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

macOS/Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2) Start backend

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
set PYTHONPATH=.
python -m backend.app
```

Backend runs on `http://localhost:8000`.

### 3) Start frontend (new terminal)

```bat
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Quick Start (Docker)

From project root:

```bash
docker compose up --build
```

That starts both services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

Docker uses:

- `backend/.env.docker`
- `frontend/.env.docker`

## API

### `POST /predict`

- Content-Type: `multipart/form-data`
- Form field name: `file`

Success example:

```json
{
  "result": "Real",
  "confidence": 0.9231
}
```

Error example:

```json
{
  "error": "Unsupported file type"
}
```

## Change Model

In `backend/.env`, set:

```env
MODEL_NAME=xception
# or
MODEL_NAME=efficientnet_b4
```

Then restart backend.

## Notes

- This project detects visual manipulation artifacts only.
- It does not do identity verification.
