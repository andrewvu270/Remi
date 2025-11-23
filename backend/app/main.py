from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware import Middleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .config import settings
import os

# Import routers
from .api import courses, tasks, schedule, upload, ml, auth, survey, guest, study_plan

# Rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/hour"],  # Default limit for all routes
    storage_uri="memory://"
)

# Debug: Print CORS origins
print("CORS Origins:", settings.BACKEND_CORS_ORIGINS)

app = FastAPI(
    title="AI Academic Scheduler",
    version="1.0.0"
)

# Add CORS middleware directly to app
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Add rate limiter to the app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Root and health endpoints with rate limiting
@app.get("/")
@limiter.limit("60/hour")
async def root(request: Request):
    return {"message": "AI Academic Scheduler API"}

@app.get("/health")
@limiter.limit("300/hour")
async def health_check(request: Request):
    return {"status": "healthy"}

# Include routers (rate limiting will be applied at individual endpoint level)
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(ml.router, prefix="/api/ml", tags=["ml"])
app.include_router(auth.router, tags=["auth"])
app.include_router(survey.router, tags=["survey"])
app.include_router(guest.router, tags=["guest"])
app.include_router(study_plan.router, prefix="/api/study-plan", tags=["study-plan"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)