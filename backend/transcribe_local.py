# transcribe_local.py — Local CPU-based Faster-Whisper STT (fallback)

from faster_whisper import WhisperModel

# CPU mode — no GPU needed, but slower (~1x real-time for large-v3)
# Use "base" or "small" for faster CPU transcription
whisper = WhisperModel("base", device="cpu", compute_type="int8")


async def transcribe_audio(audio_path: str) -> dict:
    """Transcribe audio using local Faster-Whisper on CPU."""
    segments, info = whisper.transcribe(audio_path, beam_size=5)
    segment_list = []
    full_text = []

    for seg in segments:
        full_text.append(seg.text)
        segment_list.append(
            {
                "start": seg.start,
                "end": seg.end,
                "text": seg.text,
            }
        )

    return {
        "transcript": " ".join(full_text),
        "segments": segment_list,
        "language": info.language,
        "duration": info.duration,
    }
