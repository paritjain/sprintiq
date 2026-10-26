import json
import time
import shutil
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from .config import DATA_DIR, UPLOAD_DIR, PROCESSED_DIR, settings
from .models.schemas import AnalysisSession

SESSIONS_FILE = DATA_DIR / "sessions_index.json"

class SessionStorage:
    def __init__(self):
        self.sessions: Dict[str, AnalysisSession] = {}
        self._load_from_disk()

    def _load_from_disk(self):
        if SESSIONS_FILE.exists():
            try:
                with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for sid, sdata in data.items():
                        self.sessions[sid] = AnalysisSession.model_validate(sdata)
            except Exception as e:
                print(f"Error loading sessions from {SESSIONS_FILE}: {e}")

    def _save_to_disk(self):
        try:
            SESSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
                serializable = {sid: sess.model_dump() for sid, sess in self.sessions.items()}
                json.dump(serializable, f, indent=2)
        except Exception as e:
            print(f"Error saving sessions: {e}")

    def get_all(self) -> List[AnalysisSession]:
        # Return sorted by created_at descending
        return sorted(list(self.sessions.values()), key=lambda s: s.created_at, reverse=True)

    def get(self, session_id: str) -> Optional[AnalysisSession]:
        return self.sessions.get(session_id)

    def save(self, session: AnalysisSession) -> AnalysisSession:
        session.updated_at = datetime.utcnow().isoformat()
        self.sessions[session.id] = session
        self._save_to_disk()
        return session

    def delete(self, session_id: str) -> bool:
        if session_id in self.sessions:
            sess = self.sessions.pop(session_id)
            self._save_to_disk()

            # Clean up session folder in processed
            session_dir = PROCESSED_DIR / session_id
            if session_dir.exists():
                shutil.rmtree(session_dir, ignore_errors=True)
            return True
        return False

    def cleanup_old_files(self):
        """Cleanup files older than CLEANUP_RETENTION_HOURS."""
        cutoff_sec = time.time() - (settings.CLEANUP_RETENTION_HOURS * 3600)
        for folder in [UPLOAD_DIR, PROCESSED_DIR]:
            for p in folder.glob("*"):
                if p.is_file() and p.stat().st_mtime < cutoff_sec:
                    try:
                        p.unlink()
                    except Exception:
                        pass
                elif p.is_dir() and p.stat().st_mtime < cutoff_sec:
                    # Keep sample sessions intact
                    if "demo" not in p.name.lower():
                        shutil.rmtree(p, ignore_errors=True)

storage = SessionStorage()
