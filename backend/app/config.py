from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

# Load .env file from backend directory
env_path = os.path.join(os.path.dirname(__file__), "../.env")
load_dotenv(env_path)

class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    
    # JWT
    SECRET_KEY: Optional[str] = None
    
    # Backend URL (for OAuth callbacks)
    BACKEND_URL: Optional[str] = None
    
    # Constants (don't need to be in .env)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # CORS - Allow specific origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",  # Local dev
        "http://localhost:8000",  # Local backend
        "https://academic-scheduler.andrewvu270.workers.dev",  # Production frontend
    ]
    
    class Config:
        # Pydantic will read from environment variables
        case_sensitive = False

settings = Settings()