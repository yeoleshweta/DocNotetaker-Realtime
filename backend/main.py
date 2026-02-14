# main.py — MedScribe API Server

import os
import uuid
import logging
from datetime import datetime

from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models import (
    NoteRequest,
    NoteResponse,
    TranscriptResponse,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    SaveNoteRequest,
    EncounterResponse,
)
from groq_client import generate_note, stream_note, generate_patient_summary
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_user_from_token,
)
from audit import log_action, get_audit_log
from database import get_db, is_db_available

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Select STT provider
if settings.STT_PROVIDER == "local":
    from transcribe_local import transcribe_audio
else:
    from transcribe_groq import transcribe_audio

# ── FastAPI App ──
app = FastAPI(
    title="MedScribe API",
    version="1.0.0",
    description="Ambient AI Clinical Documentation Engine — Powered by Groq + MedGemma",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory stores (used when DB is unavailable) ──
_users_store: dict = {}  # email -> user dict
_encounters_store: dict = {}  # id -> encounter dict


# ── Health Check ──
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if is_db_available() else "stateless",
        "model": settings.GROQ_MODEL,
        "stt_provider": settings.STT_PROVIDER,
    }


# ── Transcription ──
@app.post("/api/transcribe", response_model=TranscriptResponse)
async def transcribe(audio: UploadFile = File(...)):
    """Upload audio file → get transcript."""
    temp_path = f"/tmp/{uuid.uuid4()}.wav"
    try:
        with open(temp_path, "wb") as f:
            content = await audio.read()
            f.write(content)

        result = await transcribe_audio(temp_path)

        await log_action(
            user_id="system",
            action="transcribe",
            details=f"duration={result.get('duration', 0)}s",
        )

        return TranscriptResponse(
            transcript=result["transcript"],
            duration=result.get("duration", 0),
            language=result.get("language", "en"),
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ── Note Generation ──
@app.post("/api/generate-note", response_model=NoteResponse)
async def create_note(req: NoteRequest):
    """Send transcript + template → get structured clinical note."""
    note = await generate_note(
        transcript=req.transcript,
        template=req.template,
        specialty=req.specialty,
    )

    await log_action(
        user_id="system",
        action="note_generated",
        details=f"template={req.template}, specialty={req.specialty}",
    )

    return NoteResponse(
        note=note,
        template=req.template,
        generated_at=datetime.utcnow().isoformat(),
        model=settings.GROQ_MODEL,
    )


# ── WebSocket Streaming ──
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

        await log_action(
            user_id="system",
            action="note_streamed",
            details=f"template={template}",
        )
    except Exception as e:
        await ws.send_json({"error": str(e), "done": True})
    finally:
        await ws.close()


# ── Patient Summary ──
@app.post("/api/patient-summary")
async def patient_summary(req: NoteRequest):
    """Generate patient-facing summary at 5th-grade reading level."""
    note = await generate_note(req.transcript, req.template, req.specialty)
    summary = await generate_patient_summary(note)

    await log_action(
        user_id="system",
        action="patient_summary_generated",
    )

    return {"clinical_note": note, "patient_summary": summary}


# ── Authentication ──
@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """Register a new user."""
    if is_db_available():
        from models import UserDB

        db_gen = get_db()
        db = next(db_gen)
        if db:
            existing = db.query(UserDB).filter(UserDB.email == req.email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")

            user = UserDB(
                email=req.email,
                hashed_password=hash_password(req.password),
                full_name=req.full_name,
                role=req.role,
                specialty=req.specialty,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            token = create_access_token(
                {"sub": user.id, "email": user.email, "role": user.role}
            )
            try:
                next(db_gen)
            except StopIteration:
                pass

            return LoginResponse(
                access_token=token, role=user.role, full_name=user.full_name
            )
    else:
        # In-memory fallback
        if req.email in _users_store:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = str(uuid.uuid4())
        _users_store[req.email] = {
            "id": user_id,
            "email": req.email,
            "hashed_password": hash_password(req.password),
            "full_name": req.full_name,
            "role": req.role,
            "specialty": req.specialty,
        }

        token = create_access_token(
            {"sub": user_id, "email": req.email, "role": req.role}
        )
        return LoginResponse(
            access_token=token, role=req.role, full_name=req.full_name
        )


@app.post("/api/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """Authenticate a user and return a JWT."""
    if is_db_available():
        from models import UserDB

        db_gen = get_db()
        db = next(db_gen)
        if db:
            user = db.query(UserDB).filter(UserDB.email == req.email).first()
            if not user or not verify_password(req.password, user.hashed_password):
                raise HTTPException(status_code=401, detail="Invalid credentials")

            token = create_access_token(
                {"sub": user.id, "email": user.email, "role": user.role}
            )
            try:
                next(db_gen)
            except StopIteration:
                pass

            await log_action(user_id=user.id, action="login")

            return LoginResponse(
                access_token=token, role=user.role, full_name=user.full_name
            )
    else:
        user = _users_store.get(req.email)
        if not user or not verify_password(req.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token(
            {"sub": user["id"], "email": user["email"], "role": user["role"]}
        )
        await log_action(user_id=user["id"], action="login")

        return LoginResponse(
            access_token=token, role=user["role"], full_name=user["full_name"]
        )

    raise HTTPException(status_code=500, detail="Authentication service unavailable")


# ── Encounters ──
@app.post("/api/save-note")
async def save_note(req: SaveNoteRequest):
    """Save or update a clinical note."""
    encounter_id = req.encounter_id

    if is_db_available():
        from models import EncounterDB
        from encryption import encrypt_text

        db_gen = get_db()
        db = next(db_gen)
        if db:
            encounter = db.query(EncounterDB).filter(EncounterDB.id == encounter_id).first()
            if encounter:
                encounter.note_encrypted = encrypt_text(req.note)
                encounter.updated_at = datetime.utcnow()
            else:
                encounter = EncounterDB(
                    id=encounter_id,
                    user_id="system",
                    note_encrypted=encrypt_text(req.note),
                )
                db.add(encounter)
            db.commit()
            try:
                next(db_gen)
            except StopIteration:
                pass
    else:
        _encounters_store[encounter_id] = {
            "id": encounter_id,
            "note": req.note,
            "updated_at": datetime.utcnow().isoformat(),
        }

    await log_action(
        user_id="system",
        action="note_saved",
        resource_type="encounter",
        resource_id=encounter_id,
    )

    return {"saved": True, "encounter_id": encounter_id}


@app.get("/api/encounters")
async def list_encounters():
    """List recent encounters."""
    if is_db_available():
        from models import EncounterDB

        db_gen = get_db()
        db = next(db_gen)
        if db:
            encounters = (
                db.query(EncounterDB)
                .order_by(EncounterDB.created_at.desc())
                .limit(20)
                .all()
            )
            try:
                next(db_gen)
            except StopIteration:
                pass
            return [
                EncounterResponse(
                    id=e.id,
                    template=e.template,
                    specialty=e.specialty,
                    status=e.status,
                    created_at=e.created_at.isoformat(),
                    preview=None,
                )
                for e in encounters
            ]

    return [
        {
            "id": eid,
            "note_preview": (data.get("note", "")[:100] if data.get("note") else None),
            "updated_at": data.get("updated_at"),
        }
        for eid, data in _encounters_store.items()
    ]


# ── Audit Log ──
@app.get("/api/audit-log")
async def audit_log():
    """Retrieve audit log (admin only in production)."""
    return get_audit_log(limit=100)


# ── Run ──
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
