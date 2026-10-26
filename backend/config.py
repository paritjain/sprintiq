import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
PROCESSED_DIR = DATA_DIR / "processed"
SAMPLES_DIR = BASE_DIR / "sample_data"
MODELS_DIR = BASE_DIR / "models_weights"

# Ensure directories exist
for directory in [UPLOAD_DIR, PROCESSED_DIR, SAMPLES_DIR, MODELS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    ALLOWED_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")
        if origin.strip()
    ]
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
    CLEANUP_RETENTION_HOURS: int = int(os.getenv("CLEANUP_RETENTION_HOURS", "24"))
    DEFAULT_SAMPLE_INTERVAL: int = int(os.getenv("DEFAULT_SAMPLE_INTERVAL", "1"))
    MODEL_PATH: Path = MODELS_DIR / "pose_landmarker_full.task"

settings = Settings()
