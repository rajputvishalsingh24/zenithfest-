from typing import Dict, Optional
from pydantic import BaseModel, Field


class EventOut(BaseModel):
    id: int
    title: str
    category: str
    description: Optional[str] = None
    event_date: str
    event_time: str
    venue: str
    capacity: int
    fee: int = 0
    icon: Optional[str] = "✨"
    available_seats: int


class EventDetail(EventOut):
    """Detailed view of a single event (same fields as EventOut for this project)."""
    pass


class EventIn(BaseModel):
    """Payload for creating a new event from the Admin Dashboard (Stretch Goal)."""
    title: Optional[str] = Field(default=None, description="Event title")
    category: Optional[str] = Field(default=None, description="Category (Technical, Cultural, Sports, Gaming, Workshop)")
    description: Optional[str] = Field(default="", description="Full event description")
    event_date: Optional[str] = Field(default=None, description="Event date in YYYY-MM-DD format")
    event_time: Optional[str] = Field(default=None, description="Event start time")
    venue: Optional[str] = Field(default=None, description="Event venue")
    capacity: Optional[int] = Field(default=None, description="Maximum number of seats (> 0)")
    fee: Optional[int] = Field(default=0, description="Registration fee in INR (>= 0)")
    icon: Optional[str] = Field(default="✨", description="Emoji icon for the event")


class RegistrationIn(BaseModel):
    student_name: Optional[str] = Field(default=None, description="Full name of the student")
    roll_number: Optional[str] = Field(default=None, description="College roll number")
    email: Optional[str] = Field(default=None, description="Student email address")
    phone: Optional[str] = Field(default=None, description="Optional phone number")


class RegistrationOut(BaseModel):
    id: int
    event_id: int
    student_name: str
    registered_at: str


class RegistrationRecordOut(BaseModel):
    id: int
    event_id: int
    event_title: str
    student_name: str
    roll_number: str
    email: str
    phone: Optional[str] = None
    registered_at: str


class StatsOut(BaseModel):
    total_events: int
    total_registrations: int
    total_capacity: int
    overall_utilization_pct: float
    upcoming_events_count: int
    events_by_category: Dict[str, int]
