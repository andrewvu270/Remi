import os
import sys

# Add the backend directory to the path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '..', 'backend')
sys.path.append(backend_dir)

from app.main import app

# Vercel entry point
# This exposes the FastAPI 'app' object
