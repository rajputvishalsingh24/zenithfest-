import sys
from pathlib import Path

# Add project root to sys.path so backend and data can be imported cleanly in serverless environment
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app

# Vercel Serverless Function entry point
# Exports the FastAPI ASGI app directly
