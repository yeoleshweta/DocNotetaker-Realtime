# MedScribe — Ambient AI Clinical Intelligence

### Powered by MedGemma 1.5 via Groq Cloud Inference

---

## 1. Executive Summary

MedScribe is a high-performance, ambient clinical documentation tool that transforms natural clinician-patient conversations into structured, audit-ready clinical notes. It leverages **MedGemma 1.5** for medical-native intelligence, hosted on **Groq's ultra-low-latency inference platform**, with a mobile-responsive web frontend built on **Antigravity.dev**.

Unlike legacy cloud scribes (Nabla, Nuance DAX), MedScribe provides:

- **Clinical accuracy** via a model pre-trained on PubMed/EHR data (not a general-purpose LLM)
- **Sub-second inference** via Groq's LPU hardware (tokens/sec far exceeding GPU inference)
- **Modular note templates** covering the four universal documentation patterns
- **Canvas-based UI** that adapts to how clinicians actually work

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌──────────────────────────────────────────────────────────┐
│  TIER 1: CLIENT (Antigravity.dev Web App)                │
│  ──────────────────────────────────────────────────────── │
│  [Audio Capture] [Note Canvas] [Template Selector]       │
│  [Recording Pulse] [HUD Overlay] [Export/Copy]           │
│  Platform: Browser (mobile-responsive, tablet-first)     │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTPS / WebSocket
┌─────────────────────────┴────────────────────────────────┐
│  TIER 2: API SERVER (FastAPI + Python)                   │
│  ──────────────────────────────────────────────────────── │
│  [Faster-Whisper STT] [Prompt Engine] [Auth/JWT]         │
│  [Session Manager] [Audit Logger] [Encryption]           │
│  Hosted on: Any VPS (no GPU required)                    │
└────────────┬────────────────────────────┬────────────────┘
             │ HTTP (Whisper)             │ HTTPS (Groq API)
             ▼                            ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│  Whisper STT           │  │  TIER 3: GROQ CLOUD          │
│  (local or Groq)       │  │  ──────────────────────────── │
│                        │  │  [MedGemma 1.5 4B-it]        │
│                        │  │  [LPU Inference Engine]       │
│                        │  │  ~500 tokens/sec output       │
└────────────────────────┘  └──────────────────────────────┘
```

### 2.2 Why Groq Instead of Local Ollama

| Factor | Local Ollama | Groq Cloud |
|--------|-------------|------------|
| **Hardware needed** | NVIDIA RTX 3060+ (12GB VRAM), 16GB RAM | Any machine with internet access |
| **Inference speed** | ~30-50 tokens/sec (4B Q4 on RTX 3060) | ~500+ tokens/sec (LPU architecture) |
| **Setup complexity** | GPU drivers, CUDA, model downloads | API key + HTTP calls |
| **Cost** | Hardware upfront ($300-$1500) | Free tier available; pay-per-token after |
| **Scaling** | Limited by single GPU | Scales automatically |
| **Privacy tradeoff** | Full on-prem (HIPAA ideal) | Data transits to Groq (BAA required) |
| **Offline capability** | Yes | No |

**Decision:** Groq is the right choice when you don't have GPU hardware available. For HIPAA compliance, you will need to execute a **Business Associate Agreement (BAA)** with Groq. Groq offers HIPAA-eligible endpoints — verify current availability on their enterprise page.

### 2.3 Revised Hardware Requirements (No GPU)

Since Groq handles all LLM inference, your server requirements drop significantly:

| Component | Development | Production |
|-----------|------------|------------|
| **CPU** | Any modern 4-core | 8-core (for Whisper STT) |
| **RAM** | 8 GB | 16 GB |
| **GPU** | Not required | Not required (Whisper can run on CPU) |
| **Storage** | 128 GB SSD | 512 GB SSD |
| **Network** | Stable internet connection | Low-latency internet (<50ms to Groq) |
| **OS** | Any (macOS, Linux, Windows) | Ubuntu 22.04 Server |

> **Note:** If you want STT to also be fast without a GPU, you can use Groq's Whisper API instead of running Faster-Whisper locally. This makes the entire backend CPU-only. See Section 4.3 for details.

---

## 3. Core Features

### 3.1 The "Big Four" Note Templates

| Template | Use Case | AI Extraction Focus |
|----------|----------|-------------------|
| **SOAP** | Standard follow-up visits | Progress monitoring, medication adherence, vitals trending |
| **H&P** | New patient / admission | Deep family history, social determinants, full ROS |
| **Consultation** | Specialist referral | Answering "Reason for Consult," specific diagnostic findings |
| **Procedure** | Surgical / technical | Time-out, anesthesia, technique, blood loss, complications |

### 3.2 Clinical Intelligence Modules

**Pertinent Negatives Engine**
Automatically extracts symptoms the patient *denies*, not just what they report. Critical for billing compliance (E/M coding) and medicolegal protection.

```
Output example:
ROS:
  Constitutional: Denies fever, chills, weight loss
  Cardiovascular: Denies chest pain, palpitations, edema
  Respiratory: Reports shortness of breath on exertion. Denies cough, hemoptysis
  GI: Not addressed
```

**Problem-Oriented Plan**
Groups treatment actions under corresponding assessment items with ICD-10 codes:

```
ASSESSMENT & PLAN:

#1 Hypertension, uncontrolled (I10)
   - Increase Lisinopril 10mg → 20mg daily
   - Recheck BP in 2 weeks
   - Continue low-sodium diet counseling

#2 Type 2 Diabetes Mellitus, stable (E11.9)
   - Continue Metformin 1000mg BID
   - A1c due next visit (last 7.1% three months ago)
```

**Medication Reconciliation**
Highlights all medication changes detected in the conversation:
- 🟢 **New medications** — green highlight
- 🔴 **Discontinued** — red with strikethrough
- 🟡 **Dosage changes** — amber with old → new values

**Patient-Facing Summary (AVS)**
Secondary output at 5th-grade reading level for the After-Visit Summary:

```
YOUR VISIT SUMMARY:

What we found: Your blood pressure is higher than we'd like.

What we're doing:
- We increased your blood pressure medicine (Lisinopril) from 10mg to 20mg.
  Take one pill every morning.
- Keep eating less salt — this helps the medicine work better.

Come back in: 2 weeks so we can check your blood pressure again.
```

---

## 4. Groq Integration — Complete Setup Guide

### 4.1 Getting Your Groq API Key

1. **Create a Groq account** at [console.groq.com](https://console.groq.com)
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**, name it `medscribe-prod`
4. Copy the key — it starts with `gsk_`
5. Store it securely (never commit to git):

```bash
# Add to your .env file (NEVER commit this file)
GROQ_API_KEY=gsk_your_key_here

# Add .env to .gitignore
echo ".env" >> .gitignore
```

### 4.2 Groq API for MedGemma Inference

Groq exposes an OpenAI-compatible `/chat/completions` endpoint. Here's how to call MedGemma:

```python
# groq_client.py — MedGemma inference via Groq

import os
import httpx
from typing import AsyncGenerator

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# ── Check Groq model availability ──
# MedGemma may be listed as one of these (verify on console.groq.com/docs/models):
#   - "medgemma-4b-it"
#   - "google/medgemma-4b-it"
#   - If MedGemma is not yet on Groq, use "gemma2-9b-it" as fallback
#     with medical system prompts (see FALLBACK STRATEGY below)
MODEL_NAME = os.getenv("GROQ_MODEL", "gemma2-9b-it")

HEADERS = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json",
}

# ── System prompts for each template ──
SYSTEM_PROMPT = """You are an expert medical scribe AI. Your task is to convert
clinician-patient conversation transcripts into structured clinical documentation.

RULES:
1. Convert verbal shorthand to formal medical terminology
   (e.g., "BP is up" → "Hypertension, uncontrolled")
2. Structure output according to the requested template format
3. List pertinent negatives explicitly for each Review of Systems category
4. Include ICD-10 codes next to each assessment item
5. Identify CPT coding level based on documentation complexity
6. NEVER fabricate findings not present in the transcript
7. Mark uncertain or ambiguous items with [VERIFY]
8. Use standard medical abbreviations (PRN, BID, QD, etc.)
"""

TEMPLATE_INSTRUCTIONS = {
    "soap": """Structure the note in SOAP format:

**SUBJECTIVE:**
- Chief Complaint (CC)
- History of Present Illness (HPI) — include onset, location, duration,
  character, aggravating/alleviating factors, radiation, timing, severity
- Review of Systems (ROS) — list pertinent positives AND negatives
- Current Medications
- Allergies

**OBJECTIVE:**
- Vitals (if mentioned)
- Physical Exam findings (organized by system)
- Lab/imaging results (if mentioned)

**ASSESSMENT:**
- Numbered problem list with ICD-10 codes

**PLAN:**
- Grouped under each assessment item
- Include medication changes, orders, referrals, follow-up""",

    "hp": """Structure as a complete History & Physical:

Chief Complaint, HPI (with full 8 elements), Past Medical History,
Past Surgical History, Family History, Social History (tobacco, alcohol,
drugs, occupation, living situation), Medications, Allergies,
Review of Systems (14 systems), Physical Exam (all systems examined),
Assessment (numbered with ICD-10), Plan (grouped by problem)""",

    "consult": """Structure as a Consultation Note:

Reason for Consultation, Requesting Physician, HPI, Relevant Past History,
Current Medications, Physical Exam (focused), Diagnostic Review,
Assessment, Recommendations to Primary Team""",

    "procedure": """Structure as a Procedure Note:

Procedure Name (with CPT), Date/Time, Indication, Informed Consent,
Attending/Participants, Anesthesia Type, Timeout Verification,
Technique (step-by-step), Findings, Specimens Sent, Estimated Blood Loss,
Complications, Disposition/Post-Procedure Plan""",
}


async def generate_note(transcript: str, template: str = "soap",
                        specialty: str = "general") -> str:
    """Generate a structured clinical note from a transcript."""

    template_instruction = TEMPLATE_INSTRUCTIONS.get(template, TEMPLATE_INSTRUCTIONS["soap"])

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"""
Template: {template_instruction}

Specialty context: {specialty}

TRANSCRIPT:
{transcript}

Generate the clinical note now. Follow the template structure exactly.
Include pertinent negatives. Mark uncertain items with [VERIFY].
"""}
    ]

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers=HEADERS,
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 4096,
                "top_p": 0.9,
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def stream_note(transcript: str, template: str = "soap",
                      specialty: str = "general") -> AsyncGenerator[str, None]:
    """Stream note generation token-by-token."""

    template_instruction = TEMPLATE_INSTRUCTIONS.get(template, TEMPLATE_INSTRUCTIONS["soap"])

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"""
Template: {template_instruction}
Specialty: {specialty}

TRANSCRIPT:
{transcript}

Generate the clinical note now.
"""}
    ]

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{GROQ_BASE_URL}/chat/completions",
            headers=HEADERS,
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 4096,
                "stream": True,
            }
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    import json
                    chunk = json.loads(line[6:])
                    delta = chunk["choices"][0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield content


async def generate_patient_summary(note: str) -> str:
    """Generate a patient-facing summary at 5th-grade reading level."""

    messages = [
        {"role": "system", "content": """You are a medical communicator.
Rewrite clinical notes in simple language that any patient can understand.
Use short sentences. Avoid ALL medical jargon. Reading level: 5th grade.
Format with clear headers: "What We Found", "What We're Doing", "Come Back In"."""},
        {"role": "user", "content": f"Rewrite this clinical note for the patient:\n\n{note}"}
    ]

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers=HEADERS,
            json={"model": MODEL_NAME, "messages": messages,
                  "temperature": 0.5, "max_tokens": 1024}
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
```

### 4.3 Speech-to-Text Options

You have two choices for transcription. Both work without a GPU:

**Option A: Groq Whisper API (Recommended — no local compute)**

```python
# transcribe_groq.py — Using Groq's hosted Whisper

import os
import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

async def transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio using Groq's Whisper API."""

    async with httpx.AsyncClient(timeout=120.0) as client:
        with open(audio_path, "rb") as audio_file:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                files={"file": (os.path.basename(audio_path), audio_file, "audio/wav")},
                data={
                    "model": "whisper-large-v3",
                    "language": "en",
                    "response_format": "verbose_json",  # includes timestamps
                    "temperature": 0.0,
                },
            )
        response.raise_for_status()
        data = response.json()

    return {
        "transcript": data["text"],
        "segments": data.get("segments", []),  # word-level timestamps
        "language": data.get("language", "en"),
        "duration": data.get("duration", 0),
    }
```

**Option B: Local Faster-Whisper (CPU mode — slower but offline)**

```python
# transcribe_local.py — Local CPU-based transcription

from faster_whisper import WhisperModel

# CPU mode — no GPU needed, but slower (~1x real-time for large-v3)
# Use "base" or "small" model for faster CPU transcription
whisper = WhisperModel("large-v3", device="cpu", compute_type="int8")

async def transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio using local Faster-Whisper on CPU."""
    segments, info = whisper.transcribe(audio_path, beam_size=5)
    segment_list = []
    full_text = []

    for seg in segments:
        full_text.append(seg.text)
        segment_list.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text,
        })

    return {
        "transcript": " ".join(full_text),
        "segments": segment_list,
        "language": info.language,
        "duration": info.duration,
    }
```

**Recommendation:** Use Groq Whisper API (Option A) for development and low-volume use. It's faster, requires zero setup, and is included in Groq's free tier. Switch to local Faster-Whisper only if you need offline capability or high-volume usage where API costs become a concern.

### 4.4 Fallback Strategy — If MedGemma Isn't on Groq

As of early 2025, Groq hosts several Google models including Gemma 2. MedGemma availability on Groq may vary. Here's the fallback chain:

1. **First choice:** `medgemma-4b-it` (if available on Groq)
2. **Second choice:** `gemma2-9b-it` (available on Groq) — general model, but the medical system prompt compensates well
3. **Third choice:** `llama-3.3-70b-versatile` (available on Groq) — larger model, excellent instruction following, pair with strong medical prompts
4. **Alternative path:** Use Groq for STT only, and use a different provider (Together AI, Fireworks) for MedGemma specifically

Check available models anytime:

```bash
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | python -m json.tool
```

---

## 5. FastAPI Backend — Complete Server

### 5.1 Main Application

```python
# main.py — MedScribe API Server

import os
import json
import uuid
from datetime import datetime
from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Import our modules (from sections above)
from groq_client import generate_note, stream_note, generate_patient_summary
from transcribe_groq import transcribe_audio  # or transcribe_local

app = FastAPI(
    title="MedScribe API",
    version="1.0.0",
    description="Ambient AI Clinical Documentation Engine"
)

# CORS — allow your Antigravity frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.antigravity.dev",  # production
        "http://localhost:3000",               # development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Data Models ──

class NoteRequest(BaseModel):
    transcript: str
    template: str = "soap"       # soap | hp | consult | procedure
    specialty: str = "general"

class NoteResponse(BaseModel):
    note: str
    template: str
    generated_at: str
    model: str

class TranscriptResponse(BaseModel):
    transcript: str
    duration: float
    language: str

class EncounterCreate(BaseModel):
    patient_id: Optional[str] = None
    template: str = "soap"
    specialty: str = "general"


# ── Endpoints ──

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/transcribe", response_model=TranscriptResponse)
async def transcribe(audio: UploadFile = File(...)):
    """Upload audio file → get transcript."""
    # Save temp file
    temp_path = f"/tmp/{uuid.uuid4()}.wav"
    try:
        with open(temp_path, "wb") as f:
            content = await audio.read()
            f.write(content)

        result = await transcribe_audio(temp_path)

        return TranscriptResponse(
            transcript=result["transcript"],
            duration=result.get("duration", 0),
            language=result.get("language", "en"),
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/generate-note", response_model=NoteResponse)
async def create_note(req: NoteRequest):
    """Send transcript + template → get structured clinical note."""
    note = await generate_note(
        transcript=req.transcript,
        template=req.template,
        specialty=req.specialty,
    )
    return NoteResponse(
        note=note,
        template=req.template,
        generated_at=datetime.utcnow().isoformat(),
        model=os.getenv("GROQ_MODEL", "gemma2-9b-it"),
    )


@app.websocket("/ws/stream-note")
async def ws_stream_note(ws: WebSocket):
    """Stream note generation token-by-token via WebSocket."""
    await ws.accept()
    try:
        data = await ws.receive_json()
        transcript = data.get("transcript", "")
        template = data.get("template", "soap")
        specialty = data.get("specialty", "general")

        async for token in stream_note(transcript, template, specialty):
            await ws.send_json({"token": token, "done": False})

        await ws.send_json({"token": "", "done": True})
    except Exception as e:
        await ws.send_json({"error": str(e), "done": True})
    finally:
        await ws.close()


@app.post("/api/patient-summary")
async def patient_summary(req: NoteRequest):
    """Generate patient-facing summary at 5th-grade reading level."""
    # First generate the clinical note
    note = await generate_note(req.transcript, req.template, req.specialty)
    # Then simplify it
    summary = await generate_patient_summary(note)
    return {"clinical_note": note, "patient_summary": summary}


# ── Run ──
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5.2 Dependencies

```
# requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.32.0
httpx==0.27.0
python-multipart==0.0.12
pydantic==2.9.0
python-dotenv==1.0.1
faster-whisper==1.1.0     # only if using local STT
python-jose[cryptography]==3.3.0  # for JWT auth
bcrypt==4.2.0
sqlalchemy==2.0.35
psycopg2-binary==2.9.9
cryptography==43.0.0      # for AES-256 encryption
```

### 5.3 Running Locally

```bash
# 1. Clone your repo
git clone https://github.com/yourusername/medscribe.git
cd medscribe/backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# 5. Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 6. Open API docs
# http://localhost:8000/docs
```

---

## 6. Antigravity.dev Frontend Setup

### 6.1 Project Configuration

1. **Create new project** on [antigravity.dev](https://antigravity.dev)
2. **Link GitHub repo** for version control of custom code blocks
3. **Set API base URL** in project settings:
   - Development: `http://localhost:8000`
   - Production: `https://api.your-clinic-domain.com`

### 6.2 Page Structure

Build these pages in the Antigravity visual editor:

| Page | Route | Purpose |
|------|-------|---------|
| **Login** | `/login` | Clinician authentication |
| **Dashboard** | `/` | Recent encounters, quick actions |
| **New Encounter** | `/encounter/new` | Template selection + recording |
| **Note Canvas** | `/encounter/:id` | AI-generated note editing |
| **Zen Mode** | `/zen` | Distraction-free recording + live notes |
| **Settings** | `/settings` | Default template, specialty, theme |

### 6.3 Custom Code Blocks for Antigravity

**Audio Capture (MediaRecorder API):**

```javascript
// Custom code block: AudioRecorder
// Add this in the New Encounter page

let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,        // mono
      sampleRate: 16000,       // 16kHz for Whisper
      echoCancellation: true,
      noiseSuppression: true,
    }
  });

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.start(1000); // capture in 1-second chunks
  updateUI('recording');
}

async function stopRecording() {
  return new Promise((resolve) => {
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      updateUI('processing');
      resolve(audioBlob);
    };
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  });
}

async function transcribeAndGenerate(audioBlob, template) {
  // Step 1: Transcribe
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const transcriptRes = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });
  const { transcript } = await transcriptRes.json();

  // Step 2: Stream note generation via WebSocket
  const ws = new WebSocket(`${WS_BASE}/ws/stream-note`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ transcript, template, specialty: 'general' }));
    updateUI('generating');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.done) {
      updateUI('complete');
      ws.close();
    } else {
      appendToCanvas(data.token);  // real-time token display
    }
  };
}
```

**WebSocket Note Streaming:**

```javascript
// Custom code block: NoteStreamer
// Used in Note Canvas and Zen Mode pages

function streamNote(transcript, template) {
  const noteContainer = document.getElementById('note-canvas');
  noteContainer.innerHTML = '';

  const ws = new WebSocket(`${WS_BASE}/ws/stream-note`);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      transcript: transcript,
      template: template,
      specialty: getSelectedSpecialty(),
    }));
  };

  ws.onmessage = (event) => {
    const { token, done, error } = JSON.parse(event.data);

    if (error) {
      showError(error);
      return;
    }

    if (done) {
      enableEditing();
      showExportOptions();
      return;
    }

    // Append token with typewriter effect
    noteContainer.textContent += token;
    noteContainer.scrollTop = noteContainer.scrollHeight;
  };

  ws.onerror = () => showError('Connection lost. Please retry.');
}
```

### 6.4 API Connection Configuration

In Antigravity's API settings, configure these endpoints:

| Name | Method | URL | Purpose |
|------|--------|-----|---------|
| `transcribe` | POST | `{BASE}/api/transcribe` | Audio → text |
| `generateNote` | POST | `{BASE}/api/generate-note` | Transcript → note |
| `streamNote` | WebSocket | `{WS_BASE}/ws/stream-note` | Real-time streaming |
| `patientSummary` | POST | `{BASE}/api/patient-summary` | Patient AVS |
| `healthCheck` | GET | `{BASE}/health` | Server status |

---

## 7. UI/UX Design Specification

### 7.1 Design Philosophy: "Modular Minimalism"

The interface prioritizes clinical efficiency over visual complexity. Every pixel must justify its existence — if a UI element doesn't help the clinician document faster, it's removed.

### 7.2 Core UI Components

**The Pulse**
A central animated indicator that communicates system state without demanding attention:
- 🔵 Blue pulse: Recording active (audio being captured)
- 🟢 Green pulse: Processing (transcription in progress)
- 🟡 Amber pulse: Generating (MedGemma producing the note)
- ⚪ Static white: Idle / ready

The pulse should be implemented as a CSS animation — subtle, organic breathing motion. It's the emotional heartbeat of the app.

**The Canvas**
Notes render as collapsible, reorderable blocks. For a SOAP note:

```
┌─ [▼] SUBJECTIVE ──────────────────── Confidence: 94% ─┐
│  CC: "My blood pressure has been running high"         │
│  HPI: 58-year-old male presents with...               │
│  ...                                                    │
└────────────────────────────────────────────────────────┘
┌─ [▼] OBJECTIVE ───────────────────── Confidence: 91% ─┐
│  Vitals: BP 158/92, HR 78, T 98.6F                    │
│  ...                                                    │
└────────────────────────────────────────────────────────┘
┌─ [▼] ASSESSMENT ──────────────────── Confidence: 87% ─┐
│  #1 Hypertension, uncontrolled (I10) [VERIFY]          │
│  ...                                                    │
└────────────────────────────────────────────────────────┘
┌─ [▼] PLAN ────────────────────────── Confidence: 89% ─┐
│  #1 Hypertension:                                      │
│  - Increase Lisinopril 10mg → 20mg daily               │
│  ...                                                    │
└────────────────────────────────────────────────────────┘

[Copy to Clipboard]  [Export PDF]  [Patient Summary]
```

**The HUD (Heads-Up Display)**
On hover/tap of any AI-generated sentence:
- Confidence score (0–100%)
- Audio timestamp link (click to hear the source moment)
- Flag button (mark for clinician review)
- Edit button (inline editing)

**Zen Mode**
Single toggle removes all UI chrome. Screen shows only:
- The Pulse (center)
- Note text appearing in real-time (below)
- A single "Stop" button

### 7.3 Responsive Breakpoints

| Breakpoint | Layout | Target Device |
|-----------|--------|--------------|
| **>1024px** | Three-column: nav sidebar + note canvas + transcript panel | Desktop / large tablet |
| **768–1024px** | Two-column: note canvas + collapsible transcript | iPad / tablet (primary) |
| **<768px** | Single column with bottom tab navigation (Record / Note / Settings) | Phone |

---

## 8. Security & HIPAA Compliance

### 8.1 Data Flow & Privacy

```
Audio (browser) ──HTTPS──→ Your Server ──HTTPS──→ Groq API
                           │                       │
                           │ Transcript stored      │ No data retained
                           │ encrypted (AES-256)    │ (verify Groq DPA)
                           │                       │
                           ▼                       ▼
                     PostgreSQL              Returns note text
                     (encrypted)             (ephemeral)
```

**Critical actions required:**

1. **Groq BAA/DPA:** Contact Groq sales to execute a Business Associate Agreement. Without this, sending PHI to Groq violates HIPAA.
2. **Antigravity BAA:** If any PHI transits through Antigravity's CDN/servers, you need a BAA with them too. Safest approach: Antigravity serves only static assets; all data flows browser → your server directly.
3. **Encryption at rest:** All stored transcripts and notes encrypted with AES-256 before writing to disk or database.
4. **Encryption in transit:** TLS 1.3 for all connections.
5. **Access controls:** JWT authentication with role-based access (physician, scribe, admin).
6. **Audit trail:** Immutable log of every note generation, edit, and access event.
7. **Session timeout:** 30-minute idle logout.

### 8.2 HIPAA Compliance Checklist

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| PHI encryption at rest | AES-256 for files + encrypted PostgreSQL | Required |
| PHI encryption in transit | TLS 1.3 via Caddy/Nginx | Required |
| Access controls | JWT + RBAC (physician, scribe, admin) | Required |
| Audit trail | Immutable audit_log table in PostgreSQL | Required |
| BAA with Groq | Contact Groq enterprise sales | **Action needed** |
| BAA with Antigravity | Verify with Antigravity.dev | **Action needed** |
| Session timeout | 30-min idle auto-logout | Required |
| Minimum necessary access | Role-based data visibility | Required |
| Breach notification | Incident response plan | Required |
| Employee training | HIPAA training for all users | Required |

---

## 9. GitHub Repository Structure

```
medscribe/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── Caddyfile
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                 # FastAPI application
│   ├── groq_client.py          # Groq API integration
│   ├── transcribe_groq.py      # Groq Whisper STT
│   ├── transcribe_local.py     # Local Faster-Whisper (fallback)
│   ├── models.py               # Pydantic schemas
│   ├── auth.py                 # JWT + bcrypt authentication
│   ├── audit.py                # Audit log service
│   ├── encryption.py           # AES-256 file encryption
│   ├── database.py             # SQLAlchemy + PostgreSQL
│   └── config.py               # Environment config loader
│
├── scripts/
│   ├── setup.sh                # One-click dev environment setup
│   ├── seed_db.py              # Initial database setup
│   └── test_groq.py            # Verify Groq API connection
│
├── antigravity/
│   ├── code-blocks/            # Custom JS for Antigravity
│   │   ├── audio-recorder.js
│   │   ├── note-streamer.js
│   │   └── export-handler.js
│   └── README.md               # Antigravity setup instructions
│
└── docs/
    ├── product_spec.md          # This document
    ├── api_reference.md         # OpenAPI documentation
    ├── hipaa_checklist.md       # Compliance tracking
    └── deployment_guide.md      # Production deployment steps
```

---

## 10. Deployment Strategy

### 10.1 Development

```bash
# Everything runs locally except Groq (cloud)
Your Machine
├── FastAPI (localhost:8000)
├── PostgreSQL (localhost:5432)       # or Docker
└── Antigravity.dev (their hosting)   # connects to localhost:8000

Groq Cloud
└── MedGemma / Gemma2 inference
└── Whisper STT
```

### 10.2 Production (Docker Compose)

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - GROQ_MODEL=${GROQ_MODEL}
      - DATABASE_URL=postgresql://medscribe:${DB_PASSWORD}@db:5432/medscribe
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: medscribe
      POSTGRES_USER: medscribe
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  caddy:
    image: caddy:2
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - api
    restart: unless-stopped

volumes:
  pg_data:
  caddy_data:
```

**Key difference from the Ollama version:** No GPU container needed. The entire stack runs on a basic VPS ($10-20/month).

### 10.3 Environment Variables

```bash
# .env.example
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=gemma2-9b-it
DATABASE_URL=postgresql://medscribe:password@localhost:5432/medscribe
JWT_SECRET=your-random-secret-here
ENCRYPTION_KEY=your-32-byte-hex-key
ALLOWED_ORIGINS=https://your-app.antigravity.dev
```

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Weeks 1–2)
- [ ] Set up Groq account, get API key, test MedGemma/Gemma2 inference
- [ ] Scaffold FastAPI backend with `/api/transcribe` and `/api/generate-note`
- [ ] Test Groq Whisper API for transcription
- [ ] Initialize GitHub repo with project structure
- [ ] Set up PostgreSQL (local Docker)

### Phase 2: Core App (Weeks 3–4)
- [ ] Build Antigravity.dev pages: Login, Dashboard, Recording, Note Canvas
- [ ] Implement audio capture via MediaRecorder in Antigravity custom code
- [ ] Connect Antigravity to backend API endpoints
- [ ] Test full pipeline: record → transcribe → generate note
- [ ] Implement all four note templates

### Phase 3: Polish & Clinical Modules (Weeks 5–6)
- [ ] Add WebSocket streaming for real-time note generation
- [ ] Build the Pulse animation, HUD overlay, Zen Mode
- [ ] Implement pertinent negatives engine
- [ ] Implement problem-oriented plan formatting
- [ ] Add patient-facing summary generation
- [ ] Add medication reconciliation highlighting

### Phase 4: Security & Deployment (Weeks 7–8)
- [ ] Implement JWT authentication + role-based access
- [ ] Add AES-256 encryption for stored data
- [ ] Build audit logging system
- [ ] Create Docker Compose production setup
- [ ] Deploy to VPS / clinic server
- [ ] Execute BAA with Groq (and Antigravity if needed)
- [ ] HIPAA compliance review with legal counsel

### Future: v1.5+ (Post-MVP)
- [ ] Photo-to-note: physical exam image analysis (wounds, rashes)
- [ ] EHR integration: direct push to Epic/Cerner via FHIR APIs
- [ ] Multi-language support: Spanish, Mandarin encounters
- [ ] AI-suggested "Next Best Actions" based on clinical guidelines
- [ ] Voice commands: "Hey MedScribe, switch to H&P template"

---

## 12. API Reference

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `GET` | `/health` | — | `{ status, timestamp }` |
| `POST` | `/api/transcribe` | `multipart/form-data: audio file` | `{ transcript, duration, language }` |
| `POST` | `/api/generate-note` | `{ transcript, template, specialty }` | `{ note, template, generated_at, model }` |
| `WS` | `/ws/stream-note` | `{ transcript, template, specialty }` | Stream: `{ token, done }` |
| `POST` | `/api/patient-summary` | `{ transcript, template, specialty }` | `{ clinical_note, patient_summary }` |
| `POST` | `/api/auth/login` | `{ email, password }` | `{ access_token, role }` |
| `GET` | `/api/encounters` | — (JWT header) | `[{ id, date, template, preview }]` |
| `POST` | `/api/save-note` | `{ encounter_id, note, edits }` | `{ saved, audit_id }` |
| `GET` | `/api/audit-log` | — (admin JWT) | `[{ action, user, timestamp, diff }]` |

---

## 13. Immediate Next Steps

1. **Create Groq account** → Get API key → Test with a sample medical prompt
2. **Create Antigravity.dev project** → Set up page structure from Section 6.2
3. **Clone repo template** → Copy backend code from Sections 4 and 5 → Get endpoints running
4. **Test the full pipeline** → Record a sample conversation → Transcribe → Generate SOAP note
5. **Iterate on prompts** → The quality of your notes depends on prompt engineering. Test with diverse clinical scenarios.
