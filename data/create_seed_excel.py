"""
Helper script to generate data/events_seed.xlsx with 14 Zenith '26 College Fest events
if the companion spreadsheet hasn't been copied into data/ yet.
"""
from pathlib import Path
import openpyxl

DATA_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = DATA_DIR / "events_seed.xlsx"

HEADERS = [
    "id",
    "title",
    "category",
    "description",
    "event_date",
    "event_time",
    "venue",
    "capacity",
    "fee",
    "icon",
]

SEED_EVENTS = [
    (
        1,
        "HackZenith 24-Hour Hackathon",
        "Technical",
        "Build innovative AI, Web3, or sustainability solutions in a 24-hour coding sprint. Mentors from top tech companies will guide teams through ideation, prototyping, and live demos.",
        "2026-11-14",
        "09:00 AM",
        "Innovation Center - Hall A",
        120,
        250,
        "💻",
    ),
    (
        2,
        "RoboWars: Arena Showdown",
        "Technical",
        "Custom-built combat robots go head-to-head in our armored polycarbonate arena. Compete in 15kg and 30kg weight classes for the ultimate engineering championship trophy.",
        "2026-11-14",
        "11:30 AM",
        "Central Quadrangle Arena",
        80,
        300,
        "🤖",
    ),
    (
        3,
        "CodeGolf & Competitive Programming",
        "Technical",
        "Solve algorithmic brainteasers under intense time pressure using the shortest and fastest code possible. Open to Python, C++, and Java programmers.",
        "2026-11-15",
        "10:00 AM",
        "CS Block - Lab 301",
        60,
        100,
        "⚡",
    ),
    (
        4,
        "Battle of the Bands: Decibel '26",
        "Cultural",
        "College rock, indie, and fusion bands compete live under festival stage lights with a concert-grade sound system. Original compositions earn bonus jury points.",
        "2026-11-14",
        "06:00 PM",
        "Open Air Amphitheatre",
        250,
        200,
        "🎸",
    ),
    (
        5,
        "Nritya: Street & Contemporary Dance-Off",
        "Cultural",
        "High-energy solo and crew dance battles spanning hip-hop, contemporary, and Indo-fusion choreography. Judged by guest choreographers.",
        "2026-11-14",
        "03:00 PM",
        "Main Auditorium",
        180,
        150,
        "💃",
    ),
    (
        6,
        "Stand-Up & Improv Comedy Night",
        "Cultural",
        "Five minutes on the mic to make the auditorium roar with laughter, followed by an interactive Whose-Line style improv showdown.",
        "2026-11-15",
        "05:00 PM",
        "Mini Auditorium",
        100,
        0,
        "🎤",
    ),
    (
        7,
        "Futsal 5v5 Lightning Cup",
        "Sports",
        "Fast-paced 5-a-side turf football tournament with 15-minute halves, knockout brackets, and live commentary under the floodlights.",
        "2026-11-14",
        "04:00 PM",
        "North Turf Ground",
        80,
        200,
        "⚽",
    ),
    (
        8,
        "3x3 Street Basketball Slam",
        "Sports",
        "Half-court 3x3 basketball tournament following official FIBA 3x3 rules, plus a crowd-favorite 3-point shootout contest.",
        "2026-11-15",
        "08:30 AM",
        "Outdoor Basketball Courts",
        64,
        150,
        "🏀",
    ),
    (
        9,
        "Blitz Chess Championship",
        "Sports",
        "5+3 Swiss-system blitz chess tournament across 7 rounds. FIDE-rated arbiters and digital clocks provided for all boards.",
        "2026-11-15",
        "11:00 AM",
        "Student Activity Center - Room 102",
        50,
        50,
        "♟️",
    ),
    (
        10,
        "Valorant LAN Champions Tour",
        "Gaming",
        "5v5 tactical shooter tournament on 240Hz LAN setups with zero-ping local servers and big-screen caster commentary for the finals.",
        "2026-11-14",
        "10:30 AM",
        "Esports Arena - Block B",
        100,
        250,
        "🎮",
    ),
    (
        11,
        "EA FC 26 Console Showdown",
        "Gaming",
        "1v1 knockout tournament on PlayStation 5 consoles. Bring your best custom tactics and claim the Zenith Golden Controller.",
        "2026-11-15",
        "01:30 PM",
        "Esports Arena - Lounge",
        48,
        100,
        "🕹️",
    ),
    (
        12,
        "Generative AI & Agentic Workflows Workshop",
        "Workshop",
        "Hands-on workshop building real LLM agents, RAG pipelines, and tool-calling applications from scratch. Bring your laptop!",
        "2026-11-14",
        "02:00 PM",
        "Seminar Hall 1",
        75,
        0,
        "🧠",
    ),
    (
        13,
        "UI/UX & Product Design Sprint",
        "Workshop",
        "Learn rapid wireframing, Figma auto-layout mastery, and usability testing techniques used by top product teams.",
        "2026-11-15",
        "10:30 AM",
        "Design Studio - Floor 2",
        45,
        0,
        "🎨",
    ),
    (
        14,
        "FPV Drone Building & Flight Clinic",
        "Workshop",
        "Understand quadcopter aerodynamics, flight controllers, and solder your first micro-drone frame followed by simulator flight training.",
        "2026-11-15",
        "02:30 PM",
        "Robotics Lab & South Lawn",
        35,
        150,
        "🚁",
    ),
]


def generate_excel() -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Events"
    ws.append(HEADERS)
    for event_row in SEED_EVENTS:
        ws.append(list(event_row))
    wb.save(OUTPUT_FILE)
    print(f"Created {OUTPUT_FILE} with {len(SEED_EVENTS)} events.")


if __name__ == "__main__":
    generate_excel()
