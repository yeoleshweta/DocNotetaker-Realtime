# database.py — SQLAlchemy engine + session management

import logging
from typing import Generator, Optional
from config import settings

logger = logging.getLogger(__name__)

# Database availability flag
db_available = False
SessionLocal = None
engine = None

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from models import Base

    if Base is not None and settings.DATABASE_URL:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        # Try to connect — if PostgreSQL is not running, we skip
        try:
            with engine.connect() as conn:
                conn.execute(conn.connection.cursor().execute("SELECT 1") if False else __import__("sqlalchemy").text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            db_available = True
            logger.info("✅ Database connected and tables created")
        except Exception as e:
            logger.warning(f"⚠️  Database unavailable — running in stateless mode: {e}")
            db_available = False

except ImportError:
    logger.warning("⚠️  SQLAlchemy not installed — running in stateless mode")


def get_db() -> Generator:
    """Get database session. Yields None if DB is unavailable."""
    if not db_available or SessionLocal is None:
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_db_available() -> bool:
    """Check if database is available."""
    return db_available
