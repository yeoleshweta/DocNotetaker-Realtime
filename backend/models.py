# models.py — Pydantic schemas + SQLAlchemy ORM models

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# ── Try SQLAlchemy import (optional — works without DB) ──
try:
    from sqlalchemy import (
        Column,
        String,
        Text,
        DateTime,
        Boolean,
        ForeignKey,
        create_engine,
    )
    from sqlalchemy.orm import DeclarativeBase, relationship

    class Base(DeclarativeBase):
        pass

    # ── ORM Models ──

    class UserDB(Base):
        __tablename__ = "users"

        id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
        email = Column(String, unique=True, nullable=False, index=True)
        hashed_password = Column(String, nullable=False)
        full_name = Column(String, nullable=False)
        role = Column(String, default="physician")  # physician | scribe | admin
        specialty = Column(String, default="general")
        default_template = Column(String, default="soap")
        is_active = Column(Boolean, default=True)
        created_at = Column(DateTime, default=datetime.utcnow)

        encounters = relationship("EncounterDB", back_populates="user")

    class EncounterDB(Base):
        __tablename__ = "encounters"

        id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
        user_id = Column(String, ForeignKey("users.id"), nullable=False)
        patient_id = Column(String, nullable=True)
        template = Column(String, default="soap")
        specialty = Column(String, default="general")
        transcript_encrypted = Column(Text, nullable=True)
        note_encrypted = Column(Text, nullable=True)
        patient_summary = Column(Text, nullable=True)
        status = Column(String, default="draft")  # draft | final | amended
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

        user = relationship("UserDB", back_populates="encounters")

    class AuditLogDB(Base):
        __tablename__ = "audit_logs"

        id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
        user_id = Column(String, nullable=False)
        action = Column(String, nullable=False)  # note_generated | note_edited | note_accessed | login | export
        resource_type = Column(String, nullable=True)  # encounter | user
        resource_id = Column(String, nullable=True)
        details = Column(Text, nullable=True)
        ip_address = Column(String, nullable=True)
        timestamp = Column(DateTime, default=datetime.utcnow)

    HAS_SQLALCHEMY = True

except ImportError:
    HAS_SQLALCHEMY = False
    Base = None


# ── Pydantic Request/Response Schemas ──

class NoteRequest(BaseModel):
    transcript: str
    template: str = "soap"  # soap | hp | consult | procedure
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


class EncounterResponse(BaseModel):
    id: str
    template: str
    specialty: str
    status: str
    created_at: str
    preview: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "physician"
    specialty: str = "general"


class SaveNoteRequest(BaseModel):
    encounter_id: str
    note: str
    edits: Optional[str] = None
