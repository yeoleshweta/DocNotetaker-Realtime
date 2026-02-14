# audit.py — Immutable audit log service

import logging
from datetime import datetime
from typing import Optional

from database import get_db, is_db_available

logger = logging.getLogger(__name__)

# In-memory audit log for stateless mode
_memory_log: list[dict] = []


async def log_action(
    user_id: str,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> dict:
    """Log an audit event. Persists to DB if available, else in-memory."""

    entry = {
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details,
        "ip_address": ip_address,
        "timestamp": datetime.utcnow().isoformat(),
    }

    if is_db_available():
        try:
            from models import AuditLogDB

            db_gen = get_db()
            db = next(db_gen)
            if db is not None:
                audit_entry = AuditLogDB(**{k: v for k, v in entry.items() if k != "timestamp"})
                db.add(audit_entry)
                db.commit()
                entry["id"] = audit_entry.id
                try:
                    next(db_gen)
                except StopIteration:
                    pass
        except Exception as e:
            logger.error(f"Failed to write audit log to DB: {e}")
            _memory_log.append(entry)
    else:
        _memory_log.append(entry)

    logger.info(f"AUDIT: {action} by {user_id} on {resource_type}:{resource_id}")
    return entry


def get_audit_log(limit: int = 100) -> list[dict]:
    """Retrieve recent audit log entries."""
    if is_db_available():
        try:
            from models import AuditLogDB

            db_gen = get_db()
            db = next(db_gen)
            if db is not None:
                entries = (
                    db.query(AuditLogDB)
                    .order_by(AuditLogDB.timestamp.desc())
                    .limit(limit)
                    .all()
                )
                try:
                    next(db_gen)
                except StopIteration:
                    pass
                return [
                    {
                        "id": e.id,
                        "user_id": e.user_id,
                        "action": e.action,
                        "resource_type": e.resource_type,
                        "resource_id": e.resource_id,
                        "details": e.details,
                        "ip_address": e.ip_address,
                        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                    }
                    for e in entries
                ]
        except Exception as e:
            logger.error(f"Failed to read audit log from DB: {e}")

    return _memory_log[-limit:]
