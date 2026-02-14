# groq_client.py — MedGemma / Gemma2 inference via Groq Cloud

import os
import json
import httpx
from typing import AsyncGenerator
from config import settings

GROQ_API_KEY = settings.GROQ_API_KEY
GROQ_BASE_URL = settings.GROQ_BASE_URL
MODEL_NAME = settings.GROQ_MODEL

HEADERS = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json",
}

# ── System prompt for medical scribe ──
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

# ── Template-specific instructions ──
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


async def generate_note(
    transcript: str, template: str = "soap", specialty: str = "general"
) -> str:
    """Generate a structured clinical note from a transcript."""

    template_instruction = TEMPLATE_INSTRUCTIONS.get(
        template, TEMPLATE_INSTRUCTIONS["soap"]
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""
Template: {template_instruction}

Specialty context: {specialty}

TRANSCRIPT:
{transcript}

Generate the clinical note now. Follow the template structure exactly.
Include pertinent negatives. Mark uncertain items with [VERIFY].
""",
        },
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
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def stream_note(
    transcript: str, template: str = "soap", specialty: str = "general"
) -> AsyncGenerator[str, None]:
    """Stream note generation token-by-token."""

    template_instruction = TEMPLATE_INSTRUCTIONS.get(
        template, TEMPLATE_INSTRUCTIONS["soap"]
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""
Template: {template_instruction}
Specialty: {specialty}

TRANSCRIPT:
{transcript}

Generate the clinical note now.
""",
        },
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
            },
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    chunk = json.loads(line[6:])
                    delta = chunk["choices"][0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield content


async def generate_patient_summary(note: str) -> str:
    """Generate a patient-facing summary at 5th-grade reading level."""

    messages = [
        {
            "role": "system",
            "content": """You are a medical communicator.
Rewrite clinical notes in simple language that any patient can understand.
Use short sentences. Avoid ALL medical jargon. Reading level: 5th grade.
Format with clear headers: "What We Found", "What We're Doing", "Come Back In".""",
        },
        {
            "role": "user",
            "content": f"Rewrite this clinical note for the patient:\n\n{note}",
        },
    ]

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers=HEADERS,
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "temperature": 0.5,
                "max_tokens": 1024,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
