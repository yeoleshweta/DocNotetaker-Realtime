# config.py — MedScribe Environment Configuration

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Groq API
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "gemma2-9b-it")
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://medscribe:password@localhost:5432/medscribe"
    )

    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    # CORS
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")

    # STT Provider
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "groq")  # "groq" or "local"

    # Session
    SESSION_TIMEOUT_MINUTES: int = 30


settings = Settings()
