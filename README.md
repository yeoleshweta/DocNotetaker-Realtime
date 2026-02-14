# MedScribe — Ambient AI Clinical Intelligence

> Transform clinician-patient conversations into structured, audit-ready clinical notes.

Powered by **MedGemma / Gemma2** via **Groq Cloud Inference**.

---

## 🏗️ Architecture

```
Frontend (Next.js)  →  Backend (FastAPI)  →  Groq Cloud (LLM + Whisper STT)
                                          →  PostgreSQL (encounters, audit)
```

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- Groq API key ([console.groq.com](https://console.groq.com))

### 2. Setup

```bash
# Clone
git clone <repo-url>
cd medscribe

# Create .env
cp .env.example .env
# Add your GROQ_API_KEY to .env

# Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Docker (Production)

```bash
docker-compose up --build
```

## 📋 Features

| Feature                      | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| 🎙️ **Audio Recording**       | Browser-based MediaRecorder with noise suppression           |
| 🗣️ **Speech-to-Text**        | Groq Whisper API (cloud) or Faster-Whisper (local CPU)       |
| 🤖 **AI Note Generation**    | SOAP, H&P, Consultation, Procedure templates                 |
| 🧘 **Zen Mode**              | Distraction-free recording with live streaming notes         |
| 💊 **Clinical Intelligence** | Pertinent negatives, ICD-10 codes, medication reconciliation |
| 👤 **Patient Summary**       | 5th-grade reading level After-Visit Summary                  |
| 🔐 **Security**              | JWT auth, AES-256 encryption, audit logging                  |

## 🔌 API Endpoints

| Method | Endpoint               | Purpose                    |
| ------ | ---------------------- | -------------------------- |
| `GET`  | `/health`              | Health check               |
| `POST` | `/api/transcribe`      | Audio file → transcript    |
| `POST` | `/api/generate-note`   | Transcript → clinical note |
| `WS`   | `/ws/stream-note`      | Real-time note streaming   |
| `POST` | `/api/patient-summary` | Patient-facing summary     |
| `POST` | `/api/auth/login`      | Authentication             |

## 📁 Project Structure

```
├── backend/
│   ├── main.py              # FastAPI application
│   ├── groq_client.py       # LLM inference
│   ├── transcribe_groq.py   # Groq Whisper STT
│   ├── auth.py              # JWT authentication
│   ├── encryption.py        # AES-256 encryption
│   └── audit.py             # Audit logging
├── frontend/
│   └── src/
│       ├── app/             # Next.js pages
│       ├── components/      # React components
│       └── lib/             # API utilities
├── scripts/
│   ├── setup.sh             # Dev setup
│   └── test_groq.py         # API verification
└── docker-compose.yml
```

## 📄 License

Private — All rights reserved.
