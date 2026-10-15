# Zenith '26 — College Fest Management System

**Zenith '26** is a full-stack college festival management web application featuring a **Student Event Portal** (browse, search, filter by category, view event details, and register for events) and a live **Coordinator Admin Dashboard** (real-time SQLite metrics, category breakdown, capacity utilization table with >90% demand alerts, and student registration management).

---

## Tech Stack

- **Frontend:** HTML5, Tailwind CSS (Play CDN), Vanilla JavaScript (`fetch` API)
- **Backend:** Python 3, FastAPI, Pydantic, Uvicorn
- **Database:** SQLite (`fest.db`) with `openpyxl` spreadsheet seeding (`data/events_seed.xlsx`)
- **API Testing:** Postman (`zenith26-api.postman_collection.json`) & FastAPI Swagger UI (`/docs`)

---

## Project Structure

```text
zenith26-fest-system/
├── backend/
│   ├── __init__.py
│   ├── main.py          # FastAPI routes, server-side validation & static file mount
│   ├── database.py      # SQLite connection helper & table schema initialization
│   ├── models.py        # Pydantic request/response schemas
│   └── seed_data.py     # Reads data/events_seed.xlsx ("Events" sheet) into fest.db
├── frontend/
│   ├── index.html       # Student Event Portal
│   ├── admin.html       # Fest Coordinator Admin Dashboard
│   └── js/
│       ├── app.js       # Student portal logic (filters, search, modal, registration)
│       └── admin.js     # Admin dashboard logic (stats, utilization table, registrations)
├── data/
│   ├── events_seed.xlsx # 14 seed events spreadsheet
│   └── create_seed_excel.py
├── requirements.txt
├── zenith26-api.postman_collection.json
└── README.md
```

---

## How to Run the Project

### 1. Create & Activate a Virtual Environment

```powershell
cd zenith26-fest-system
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Ensure `data/events_seed.xlsx` Exists & Seed the Database

Place your `events_seed.xlsx` file inside `data/events_seed.xlsx` (or generate the 14 default Zenith '26 events with `python data/create_seed_excel.py`), then run:

```powershell
python backend/seed_data.py
```

### 4. Start the FastAPI Server

```powershell
uvicorn backend.main:app --reload
```

### 5. Open in Browser

- **Student Event Portal:** [http://localhost:8000/](http://localhost:8000/)
- **Admin Dashboard:** [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- **Interactive API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/events` | List all events (optional `?category=` and `?search=` query params) with live `available_seats`. |
| `GET` | `/api/events/{event_id}` | Get full details for a single event by ID (`404` if not found). |
| `POST` | `/api/events/{event_id}/register` | Register a student for an event (`201 Created`). Validates required fields & `@` in email (`400`), event existence (`404`), capacity (`409 Event is full`), and duplicate email per event (`409 Already registered`). |
| `GET` | `/api/registrations` | List all registrations with joined `event_title` (optional `?event_id=` filter). |
| `GET` | `/api/stats` | Live dashboard statistics: `total_events`, `total_registrations`, `total_capacity`, `overall_utilization_pct`, `upcoming_events_count`, and `events_by_category`. |
| `POST` | `/api/events` | *(Stretch Goal)* Create a new event from the Admin Dashboard (`201 Created`). |
| `DELETE` | `/api/registrations/{registration_id}` | *(Stretch Goal)* Cancel a student registration and immediately free up a seat. |
