# encryption.py — AES-256 encryption for PHI at rest

import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from config import settings


def _get_key() -> bytes:
    """Derive a 32-byte key from the configured encryption key."""
    raw_key = settings.ENCRYPTION_KEY or "dev-key-not-for-production"
    return hashlib.sha256(raw_key.encode()).digest()


def encrypt_text(plaintext: str) -> str:
    """Encrypt text using AES-256-GCM. Returns base64-encoded ciphertext."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    # Prepend nonce to ciphertext and base64-encode
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_text(encrypted: str) -> str:
    """Decrypt AES-256-GCM encrypted text from base64."""
    key = _get_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(encrypted)
    nonce = raw[:12]
    ciphertext = raw[12:]
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")
