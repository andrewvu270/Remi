from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

# Load .env file from project root
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
load_dotenv(env_path)

class Settings(BaseSettings):
    # Database Configuration
    # Use DATABASE_URL for local PostgreSQL or Supabase
    DATABASE_URL: Optional[str] = None
    
    # Supabase Database (Optional - for production)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_DB_PASSWORD: Optional[str] = None
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    
    # JWT
    SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # CORS - Production should only include specific domains
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000", 
        "http://localhost:8000", 
        "http://127.0.0.1:3000", 
        "http://127.0.0.1:8000",
        "http://10.0.0.26:3000",  # Your local network IP
        "https://academic-scheduler.andrewvu270.workers.dev",  # Your Cloudflare Pages domain
        "*"  # Allow all origins temporarily (remove this in production)
    ]
    
    class Config:
        # Pydantic will read from environment variables
        case_sensitive = False

settings = Settings()