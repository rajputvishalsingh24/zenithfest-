from contextlib import asynccontextmanager
from datetime import date, datetime
from pathlib import Path
import sqlite3
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.database import get_db_connection, init_db
from backend.models import (
    EventDetail,
    EventIn,
    EventOut,
    RegistrationIn,
    RegistrationOut,
    RegistrationRecordOut,
    StatsOut,
)
from backend.seed_data import seed_events

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize SQLite tables and seed initial events on server startup."""
    init_db()
    seed_events()
    yield


app = FastAPI(
    title="Zenith '26 College Fest Management API",
    description="Backend API for the Zenith '26 Student Event Portal and Admin Dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return 400 Bad Request with a readable detail message on malformed request bodies."""
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = ".".join(str(x) for x in err.get("loc", []) if x != "body")
        msg = err.get("msg", "Invalid value")
        messages.append(f"{loc}: {msg}" if loc else msg)
    detail_msg = "; ".join(messages) if messages else "Invalid request payload"
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": detail_msg},
    )


@app.get("/api/events", response_model=List[EventOut])
def list_events(
    category: Optional[str] = Query(default=None, description="Filter by event category"),
    search: Optional[str] = Query(default=None, description="Case-insensitive search by event title"),
):
    """
    List all events with optional category and title search filtering.
    Computes available_seats live as capacity minus current registrations count.
    """
    conn = get_db_connection()
    try:
        query = """
            SELECT
                e.id,
                e.title,
                e.category,
                e.description,
                e.event_date,
                e.event_time,
                e.venue,
                e.capacity,
                e.fee,
                e.icon,
                (e.capacity - COUNT(r.id)) AS available_seats
            FROM events e
            LEFT JOIN registrations r ON e.id = r.event_id
            WHERE 1=1
        """
        params: list = []

        if category and category.strip() and category.strip().lower() != "all":
            query += " AND LOWER(e.category) = LOWER(?)"
            params.append(category.strip())

        if search and search.strip():
            query += " AND LOWER(e.title) LIKE LOWER(?)"
            params.append(f"%{search.strip()}%")

        query += " GROUP BY e.id ORDER BY e.id ASC;"

        rows = conn.execute(query, params).fetchall()
        results: List[EventOut] = []
        for row in rows:
            results.append(
                EventOut(
                    id=row["id"],
                    title=row["title"],
                    category=row["category"],
                    description=row["description"],
                    event_date=row["event_date"],
                    event_time=row["event_time"],
                    venue=row["venue"],
                    capacity=row["capacity"],
                    fee=row["fee"],
                    icon=row["icon"] or "✨",
                    available_seats=max(0, row["available_seats"]),
                )
            )
        return results
    finally:
        conn.close()


@app.get("/api/events/{event_id}", response_model=EventDetail)
def get_event(event_id: int):
    """Return details for a single event by ID, or 404 if not found."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT
                e.id,
                e.title,
                e.category,
                e.description,
                e.event_date,
                e.event_time,
                e.venue,
                e.capacity,
                e.fee,
                e.icon,
                (e.capacity - COUNT(r.id)) AS available_seats
            FROM events e
            LEFT JOIN registrations r ON e.id = r.event_id
            WHERE e.id = ?
            GROUP BY e.id;
            """,
            (event_id,),
        ).fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id {event_id} not found",
            )

        return EventDetail(
            id=row["id"],
            title=row["title"],
            category=row["category"],
            description=row["description"],
            event_date=row["event_date"],
            event_time=row["event_time"],
            venue=row["venue"],
            capacity=row["capacity"],
            fee=row["fee"],
            icon=row["icon"] or "✨",
            available_seats=max(0, row["available_seats"]),
        )
    finally:
        conn.close()


@app.post(
    "/api/events/{event_id}/register",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
def register_for_event(event_id: int, payload: RegistrationIn):
    """
    Register a student for an event with strict server-side validation:
    - 404 if event_id does not exist
    - 400 if student_name, roll_number, or email is missing/empty
    - 400 if email does not contain '@'
    - 409 'Event is full' if event is already at capacity
    - 409 'Already registered' if email is already registered for this event
    """
    student_name = (payload.student_name or "").strip()
    roll_number = (payload.roll_number or "").strip()
    email = (payload.email or "").strip().lower()
    phone = (payload.phone or "").strip() or None

    # 1. Required fields check (400 if missing)
    missing_fields = []
    if not student_name:
        missing_fields.append("student_name")
    if not roll_number:
        missing_fields.append("roll_number")
    if not email:
        missing_fields.append("email")

    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required field(s): {', '.join(missing_fields)}",
        )

    # 2. Email format check (400 if invalid)
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address: must contain '@'",
        )

    conn = get_db_connection()
    try:
        # 3. Check event existence (404 if not found)
        event_row = conn.execute(
            "SELECT id, title, capacity FROM events WHERE id = ?;",
            (event_id,),
        ).fetchone()

        if not event_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id {event_id} not found",
            )

        # 4. Check duplicate registration first or capacity
        existing_reg = conn.execute(
            """
            SELECT id FROM registrations
            WHERE event_id = ? AND LOWER(email) = LOWER(?);
            """,
            (event_id, email),
        ).fetchone()

        if existing_reg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already registered",
            )

        # 5. Check capacity (409 "Event is full" if at capacity)
        reg_count_row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM registrations WHERE event_id = ?;",
            (event_id,),
        ).fetchone()
        current_registrations = reg_count_row["cnt"] if reg_count_row else 0

        if current_registrations >= event_row["capacity"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Event is full",
            )

        # 6. Insert registration
        registered_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            cursor = conn.execute(
                """
                INSERT INTO registrations (
                    event_id, student_name, roll_number, email, phone, registered_at
                ) VALUES (?, ?, ?, ?, ?, ?);
                """,
                (event_id, student_name, roll_number, email, phone, registered_at),
            )
            conn.commit()
            new_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already registered",
            )

        return RegistrationOut(
            id=new_id,
            event_id=event_id,
            student_name=student_name,
            registered_at=registered_at,
        )
    finally:
        conn.close()


@app.get("/api/registrations", response_model=List[RegistrationRecordOut])
def list_registrations(
    event_id: Optional[int] = Query(default=None, description="Filter registrations by event_id"),
):
    """
    Return all student registrations joined with the event's title.
    Optionally filter by event_id.
    """
    conn = get_db_connection()
    try:
        query = """
            SELECT
                r.id,
                r.event_id,
                e.title AS event_title,
                r.student_name,
                r.roll_number,
                r.email,
                r.phone,
                r.registered_at
            FROM registrations r
            INNER JOIN events e ON r.event_id = e.id
        """
        params: list = []
        if event_id is not None:
            query += " WHERE r.event_id = ?"
            params.append(event_id)

        query += " ORDER BY r.id DESC;"
        rows = conn.execute(query, params).fetchall()

        return [
            RegistrationRecordOut(
                id=row["id"],
                event_id=row["event_id"],
                event_title=row["event_title"],
                student_name=row["student_name"],
                roll_number=row["roll_number"],
                email=row["email"],
                phone=row["phone"],
                registered_at=row["registered_at"],
            )
            for row in rows
        ]
    finally:
        conn.close()


@app.get("/api/stats", response_model=StatsOut)
def get_stats():
    """
    Compute live dashboard statistics from the database:
    - total_events
    - total_registrations
    - total_capacity
    - overall_utilization_pct (rounded to 1 decimal place)
    - upcoming_events_count (event_date >= today)
    - events_by_category
    """
    conn = get_db_connection()
    try:
        totals_row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_events,
                COALESCE(SUM(capacity), 0) AS total_capacity
            FROM events;
            """
        ).fetchone()
        total_events = totals_row["total_events"] if totals_row else 0
        total_capacity = totals_row["total_capacity"] if totals_row else 0

        reg_row = conn.execute("SELECT COUNT(*) AS total_registrations FROM registrations;").fetchone()
        total_registrations = reg_row["total_registrations"] if reg_row else 0

        overall_utilization_pct = (
            round((total_registrations / total_capacity) * 100, 1)
            if total_capacity > 0
            else 0.0
        )

        today_str = date.today().isoformat()
        upcoming_row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM events WHERE event_date >= ?;",
            (today_str,),
        ).fetchone()
        upcoming_events_count = upcoming_row["cnt"] if upcoming_row else 0

        cat_rows = conn.execute(
            """
            SELECT category, COUNT(*) AS cnt
            FROM events
            GROUP BY category
            ORDER BY cnt DESC, category ASC;
            """
        ).fetchall()
        events_by_category = {row["category"]: row["cnt"] for row in cat_rows}

        return StatsOut(
            total_events=total_events,
            total_registrations=total_registrations,
            total_capacity=total_capacity,
            overall_utilization_pct=overall_utilization_pct,
            upcoming_events_count=upcoming_events_count,
            events_by_category=events_by_category,
        )
    finally:
        conn.close()


# --- Stretch Goal Endpoints ---

@app.post("/api/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventIn):
    """
    Stretch Goal 1: Allow admins to create a new event with strict server-side validation.
    """
    title = (payload.title or "").strip()
    category = (payload.category or "").strip()
    description = (payload.description or "").strip()
    event_date = (payload.event_date or "").strip()
    event_time = (payload.event_time or "").strip()
    venue = (payload.venue or "").strip()
    capacity = payload.capacity
    fee = payload.fee if payload.fee is not None else 0
    icon = (payload.icon or "✨").strip() or "✨"

    missing = []
    if not title:
        missing.append("title")
    if not category:
        missing.append("category")
    if not event_date:
        missing.append("event_date")
    if not event_time:
        missing.append("event_time")
    if not venue:
        missing.append("venue")
    if capacity is None:
        missing.append("capacity")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required field(s): {', '.join(missing)}",
        )

    if capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capacity must be greater than 0",
        )

    if fee < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fee cannot be negative",
        )

    conn = get_db_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO events (
                title, category, description, event_date, event_time, venue, capacity, fee, icon
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (title, category, description, event_date, event_time, venue, capacity, fee, icon),
        )
        conn.commit()
        new_id = cursor.lastrowid

        return EventOut(
            id=new_id,
            title=title,
            category=category,
            description=description,
            event_date=event_date,
            event_time=event_time,
            venue=venue,
            capacity=capacity,
            fee=fee,
            icon=icon,
            available_seats=capacity,
        )
    finally:
        conn.close()


@app.delete("/api/registrations/{registration_id}")
def delete_registration(registration_id: int):
    """
    Stretch Goal 2: Allow admins to cancel/delete a registration by ID.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT id, event_id, student_name, email FROM registrations WHERE id = ?;",
            (registration_id,),
        ).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Registration with id {registration_id} not found",
            )

        conn.execute("DELETE FROM registrations WHERE id = ?;", (registration_id,))
        conn.commit()
        return {
            "message": "Registration cancelled successfully",
            "id": registration_id,
            "event_id": row["event_id"],
            "student_name": row["student_name"],
        }
    finally:
        conn.close()


# Mount frontend directory as static files (Step 4)
# Placed after all /api/* routes so API endpoints always take precedence.
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
