import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.models.schemas import EventType

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "mediapipe_version" in data
    assert data["version"] == "1.0.0"

def test_list_analyses():
    response = client.get("/api/analyses")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_invalid_video_format_rejection():
    # Attempt to upload a text file as video
    files = {"video": ("fake_file.txt", b"not a video content", "text/plain")}
    data = {"event_type": "sprint"}
    response = client.post("/api/analyses", files=files, data=data)
    assert response.status_code == 400
    assert "Unsupported video format" in response.json()["detail"]

def test_nonexistent_analysis_404():
    response = client.get("/api/analyses/non_existent_id_99999")
    assert response.status_code == 404
