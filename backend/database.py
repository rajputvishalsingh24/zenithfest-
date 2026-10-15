import os
from pathlib import Path
import sqlite3

BASE_DIR = Path(__file__).resolve().parent.parent

# On Vercel / serverless platforms, only /tmp is writable
if os.environ.get("VERCEL"):
    DB_PATH = Path("/tmp/fest.db")
else:
    DB_PATH = BASE_DIR / "fest.db"


def _raw_connection() -> sqlite3.Connection:
    """Open connection to the SQLite database with Row factory and foreign keys."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    """Create the events and registrations tables if they do not already exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = _raw_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                event_date TEXT NOT NULL,
                event_time TEXT NOT NULL,
                venue TEXT NOT NULL,
                capacity INTEGER NOT NULL,
                fee INTEGER NOT NULL DEFAULT 0,
                icon TEXT
            );
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL REFERENCES events(id),
                student_name TEXT NOT NULL,
                roll_number TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                registered_at TEXT NOT NULL,
                UNIQUE(event_id, email)
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def get_db_connection() -> sqlite3.Connection:
    """Create and return a SQLite connection to fest.db with Row factory enabled."""
    if not DB_PATH.exists():
        init_db()
        try:
            from backend.seed_data import seed_events
            seed_events()
        except Exception:
            pass
    return _raw_connection()


# Ensure tables exist whenever database module is imported
init_db()
