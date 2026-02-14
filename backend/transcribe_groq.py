# transcribe_groq.py — Groq-hosted Whisper STT

import os
import httpx
from config import settings


async def transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio using Groq's Whisper API."""

    async with httpx.AsyncClient(timeout=120.0) as client:
        with open(audio_path, "rb") as audio_file:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={
                    "file": (
                        os.path.basename(audio_path),
                        audio_file,
                        "audio/wav",
                    )
                },
                data={
                    "model": "whisper-large-v3",
                    "language": "en",
                    "response_format": "verbose_json",
                    "temperature": "0.0",
                },
            )
        response.raise_for_status()
        data = response.json()

    return {
        "transcript": data["text"],
        "segments": data.get("segments", []),
        "language": data.get("language", "en"),
        "duration": data.get("duration", 0),
    }
