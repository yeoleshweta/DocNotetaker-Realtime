#!/usr/bin/env python3
"""Test Groq API connection and model availability."""

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"


async def check_connection():
    """Check Groq API connection and list available models."""

    if not GROQ_API_KEY or GROQ_API_KEY == "gsk_your_key_here":
        print("❌ GROQ_API_KEY not set. Please add it to your .env file.")
        return False

    print(f"🔑 API Key: {GROQ_API_KEY[:8]}...{GROQ_API_KEY[-4:]}")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Check models
        print("\n📋 Available Models:")
        try:
            resp = await client.get(f"{GROQ_BASE_URL}/models", headers=headers)
            resp.raise_for_status()
            models = resp.json().get("data", [])

            medical_models = []
            for m in sorted(models, key=lambda x: x["id"]):
                name = m["id"]
                marker = ""
                if "medgemma" in name.lower():
                    marker = " ⭐ MEDICAL"
                    medical_models.append(name)
                elif "gemma" in name.lower():
                    marker = " 🔹 GEMMA"
                elif "whisper" in name.lower():
                    marker = " 🎤 STT"
                print(f"   • {name}{marker}")

            if medical_models:
                print(f"\n✅ MedGemma available: {', '.join(medical_models)}")
            else:
                print("\n⚠️  MedGemma not found on Groq. Using Gemma2 with medical prompts.")

        except httpx.HTTPError as e:
            print(f"❌ Failed to list models: {e}")
            return False

        # Test inference
        print("\n🧪 Testing inference...")
        try:
            model = os.getenv("GROQ_MODEL", "gemma2-9b-it")
            resp = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [
                        {"role": "user", "content": "Say 'MedScribe API connected successfully' in one sentence."}
                    ],
                    "max_tokens": 50,
                },
            )
            resp.raise_for_status()
            reply = resp.json()["choices"][0]["message"]["content"]
            print(f"   Model: {model}")
            print(f"   Response: {reply}")
            print("\n✅ Groq API is working!")
            return True

        except httpx.HTTPError as e:
            print(f"❌ Inference failed: {e}")
            return False


if __name__ == "__main__":
    asyncio.run(check_connection())
