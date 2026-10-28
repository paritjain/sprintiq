import os
import sys
import asyncio
import uuid
import shutil
import cv2
from pathlib import Path

# Prevent WinError 10054 ConnectionResetError during video streaming on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .config import settings, DATA_DIR, UPLOAD_DIR, PROCESSED_DIR, SAMPLES_DIR
from .models.schemas import (
    HealthResponse,
    AnalysisSession,
    EventType,
    CameraView,
    AnalysisStatus,
    CalibrationConfig,
    FrameLandmarks,
)
from .storage import storage
from .core.video_processor import VideoProcessor
from .core.pose_detector import PoseDetector
from .core.calibration import SpatialCalibrator
from .core.biomechanics import BiomechanicsEngine
from .core.rule_engine import BiomechanicsRuleEngine
from .core.report_generator import ReportGenerator
from .core.sample_generator import SampleVideoGenerator

app = FastAPI(
    title="SprintIQ API",
    description="Automated Video-Based Sports Biomechanics & Performance Analysis Engine",
    version="1.0.0"
)

# Configure CORS securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount media directory for video playback, thumbnails, and exports
app.mount("/api/media", StaticFiles(directory=str(DATA_DIR)), name="media")

def run_analysis_pipeline(session_id: str, video_path: Path, sample_interval: int):
    """Executes the complete video processing and biomechanics analysis pipeline."""
    session = storage.get(session_id)
    if not session:
        return

    pose_detector = None
    try:
        session.status = AnalysisStatus.PROCESSING
        session.progress_pct = 10
        session.status_message = "Decoding video and extracting frame metadata..."
        storage.save(session)

        # 1. Video validation and metadata
        meta = VideoProcessor.get_metadata(video_path)
        session.video_metadata = meta

        # Extract thumbnail
        session_dir = PROCESSED_DIR / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        thumb_path = session_dir / "thumbnail.jpg"
        if VideoProcessor.extract_thumbnail(video_path, thumb_path):
            session.thumbnail_relative_url = f"/api/media/processed/{session_id}/thumbnail.jpg"

        session.progress_pct = 25
        session.status_message = "Initializing MediaPipe Pose Landmarker..."
        storage.save(session)

        # 2. MediaPipe Pose Estimation
        pose_detector = PoseDetector()

        raw_frames: List[FrameLandmarks] = []
        annotated_frames = []

        total_frames = meta.total_frames
        fps = meta.fps or 30.0

        session.status_message = "Running human pose landmark extraction across frames..."
        storage.save(session)

        # Annotate video output setup
        annotated_video_path = session_dir / "annotated.mp4"
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_writer = cv2.VideoWriter(
            str(annotated_video_path),
            fourcc,
            fps / sample_interval,
            (meta.width, meta.height)
        )

        processed_count = 0
        total_sample_frames = max(int(total_frames / sample_interval), 1)

        for frame_idx, timestamp_s, frame_bgr in VideoProcessor.iter_frames(video_path, sample_interval=sample_interval):
            flm = pose_detector.process_frame(frame_bgr, frame_idx, timestamp_s)
            raw_frames.append(flm)

            # Draw skeleton overlay on annotated video
            annotated_frame = PoseDetector.draw_skeleton(frame_bgr, flm.landmarks)
            out_writer.write(annotated_frame)

            processed_count += 1
            if processed_count % 15 == 0:
                current_pct = min(25 + int((processed_count / total_sample_frames) * 45), 70)
                session.progress_pct = current_pct
                session.status_message = f"Processing pose landmarks: frame {processed_count}/{total_sample_frames}"
                storage.save(session)

        out_writer.release()
        session.annotated_video_relative_url = f"/api/media/processed/{session_id}/annotated.mp4"

        # Save frame landmarks to JSON file
        landmarks_file = session_dir / "landmarks.json"
        with open(landmarks_file, "w", encoding="utf-8") as f:
            f.write(json.dumps([f.model_dump() for f in raw_frames], indent=2))

        session.progress_pct = 75
        session.status_message = "Computing biomechanical parameters and event timing..."
        storage.save(session)

        # 3. Biomechanical calculations
        if session.event_type == EventType.SPRINT:
            sprint_metrics, events, time_series = BiomechanicsEngine.analyze_sprint(
                frame_records=raw_frames,
                video_width=meta.width,
                video_height=meta.height,
                fps=fps,
                calibration=session.calibration,
            )
            session.sprint_metrics = sprint_metrics
            session.events = events
            session.time_series = time_series

            # Observations
            session.observations = BiomechanicsRuleEngine.evaluate_sprint(
                metrics=sprint_metrics,
                calibration=session.calibration,
            )
        else:
            jump_metrics, events, time_series = BiomechanicsEngine.analyze_jump(
                frame_records=raw_frames,
                video_width=meta.width,
                video_height=meta.height,
                fps=fps,
                calibration=session.calibration,
            )
            session.jump_metrics = jump_metrics
            session.events = events
            session.time_series = time_series

            # Observations
            session.observations = BiomechanicsRuleEngine.evaluate_jump(
                metrics=jump_metrics,
                calibration=session.calibration,
            )

        session.progress_pct = 90
        session.status_message = "Generating downloadable reports (PDF, CSV, JSON)..."
        storage.save(session)

        # 4. Generate report files
        ReportGenerator.export_json(session, session_dir / "report.json")
        ReportGenerator.export_csv(session, session_dir / "metrics.csv")
        try:
            ReportGenerator.export_pdf(session, session_dir / "report.pdf")
        except Exception as e:
            print(f"PDF generation error (optional fallback): {e}")

        session.progress_pct = 100
        session.status = AnalysisStatus.COMPLETED
        session.status_message = "Analysis completed successfully."
        storage.save(session)

    except Exception as e:
        session.status = AnalysisStatus.FAILED
        session.status_message = "Analysis failed"
        session.error_message = str(e)
        storage.save(session)
        print(f"Error in analysis pipeline for {session_id}: {e}")
    finally:
        if pose_detector:
            pose_detector.close()

import json

@app.get("/")
def root():
    """Root info endpoint directing to health and documentation."""
    return {
        "service": "SprintIQ Sports Biomechanics API",
        "status": "online",
        "health_endpoint": "/api/health",
        "docs": "/docs",
        "version": "1.0.0",
    }

@app.get("/api/health", response_model=HealthResponse)
@app.head("/api/health")
@app.get("/health", response_model=HealthResponse)
def get_health():
    """Health status check and model availability inspection."""
    import mediapipe as mp
    model_exists = settings.MODEL_PATH.exists()
    return HealthResponse(
        status="healthy" if model_exists else "degraded",
        version="1.0.0",
        mediapipe_version=mp.__version__,
        model_loaded=model_exists,
        model_path=str(settings.MODEL_PATH),
        system_timestamp=datetime.utcnow().isoformat(),
    )

@app.get("/api/analyses", response_model=List[AnalysisSession])
def list_analyses():
    """Returns all stored analysis sessions."""
    return storage.get_all()

@app.post("/api/analyses", response_model=AnalysisSession)
async def create_analysis(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    name: Optional[str] = Form(None),
    event_type: EventType = Form(...),
    camera_view: CameraView = Form(CameraView.SIDE),
    known_distance_m: Optional[float] = Form(None),
    calibration_point_1_x: Optional[float] = Form(None),
    calibration_point_1_y: Optional[float] = Form(None),
    calibration_point_2_x: Optional[float] = Form(None),
    calibration_point_2_y: Optional[float] = Form(None),
    sample_interval: int = Form(1),
    processing_mode: str = Form("detailed"),
):
    """Uploads a video, validates codec and size, and queues pipeline processing."""
    # Validate extension
    filename = video.filename or "upload.mp4"
    ext = Path(filename).suffix.lower()
    if ext not in [".mp4", ".mov", ".avi", ".mkv"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Supported formats: .mp4, .mov, .avi"
        )

    session_id = f"sess_{uuid.uuid4().hex[:10]}"
    upload_file_path = UPLOAD_DIR / f"{session_id}_{filename}"

    # Write video to disk
    try:
        with open(upload_file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded video: {str(e)}")

    file_size_mb = os.path.getsize(upload_file_path) / (1024 * 1024)
    if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
        upload_file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Video file size ({file_size_mb:.1f} MB) exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    # Perform spatial calibration setup
    p1 = [calibration_point_1_x, calibration_point_1_y] if (calibration_point_1_x is not None and calibration_point_1_y is not None) else None
    p2 = [calibration_point_2_x, calibration_point_2_y] if (calibration_point_2_x is not None and calibration_point_2_y is not None) else None
    calibration_config = SpatialCalibrator.compute_scale(
        known_distance_m=known_distance_m,
        point1=p1,
        point2=p2,
        camera_view=camera_view
    )

    session_name = name.strip() if name and name.strip() else f"{event_type.value.capitalize()} Analysis ({datetime.utcnow().strftime('%b %d, %H:%M')})"

    new_session = AnalysisSession(
        id=session_id,
        name=session_name,
        event_type=event_type,
        status=AnalysisStatus.QUEUED,
        progress_pct=0,
        status_message="Video uploaded. Waiting for analysis pipeline...",
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
        calibration=calibration_config,
        video_relative_url=f"/api/media/uploads/{upload_file_path.name}",
        is_sample=False,
    )

    storage.save(new_session)

    # Trigger background pipeline
    background_tasks.add_task(
        run_analysis_pipeline,
        session_id=session_id,
        video_path=upload_file_path,
        sample_interval=max(sample_interval, 1)
    )

    return new_session

@app.post("/api/analyses/load-demo/{event_type}", response_model=AnalysisSession)
def load_or_generate_demo(event_type: EventType, background_tasks: BackgroundTasks):
    """
    Creates a demonstration analysis session using the bundled realistic athletic kinematic video.
    Ensures evaluators and instructors have instant access to real computer vision analysis.
    """
    session_id = f"demo_{event_type.value}_{uuid.uuid4().hex[:6]}"
    demo_video_path = SAMPLES_DIR / f"demo_{event_type.value}.mp4"

    # Generate synthetic video if not already present
    if not demo_video_path.exists():
        if event_type == EventType.SPRINT:
            SampleVideoGenerator.generate_sprint_demo(demo_video_path)
        else:
            SampleVideoGenerator.generate_jump_demo(demo_video_path)

    # Standard 2D track calibration (e.g. 90 pixels = 1.0 meter)
    calib = SpatialCalibrator.compute_scale(
        known_distance_m=1.0,
        point1=[80.0, 420.0],
        point2=[170.0, 420.0],
        camera_view=CameraView.SIDE
    )

    sess_name = f"Sample: Track {event_type.value.capitalize()} Trial"
    session = AnalysisSession(
        id=session_id,
        name=sess_name,
        event_type=event_type,
        status=AnalysisStatus.QUEUED,
        progress_pct=0,
        status_message="Demo video queued for analysis...",
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat(),
        calibration=calib,
        video_relative_url=f"/api/media/samples/{demo_video_path.name}",
        is_sample=True,
    )
    storage.save(session)

    # Run processing
    background_tasks.add_task(
        run_analysis_pipeline,
        session_id=session_id,
        video_path=demo_video_path,
        sample_interval=1
    )

    return session

@app.get("/api/analyses/{analysis_id}", response_model=AnalysisSession)
def get_analysis(analysis_id: str):
    """Returns analysis session by ID."""
    sess = storage.get(analysis_id)
    if not sess:
        raise HTTPException(status_code=404, detail=f"Analysis session '{analysis_id}' not found.")
    return sess

@app.get("/api/analyses/{analysis_id}/landmarks")
def get_landmarks(analysis_id: str):
    """Returns extracted frame landmark time series."""
    sess = storage.get(analysis_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    landmarks_file = PROCESSED_DIR / analysis_id / "landmarks.json"
    if not landmarks_file.exists():
        return []

    with open(landmarks_file, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/analyses/{analysis_id}/events")
def get_events(analysis_id: str):
    """Returns detected movement events."""
    sess = storage.get(analysis_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    return sess.events

@app.get("/api/analyses/{analysis_id}/export")
def export_analysis(analysis_id: str, format: str = Query("json", pattern="^(json|csv|pdf)$")):
    """Downloads export in requested format."""
    sess = storage.get(analysis_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Analysis session not found.")

    session_dir = PROCESSED_DIR / analysis_id

    if format == "json":
        json_file = session_dir / "report.json"
        if not json_file.exists():
            ReportGenerator.export_json(sess, json_file)
        return FileResponse(
            str(json_file),
            media_type="application/json",
            filename=f"SprintIQ_{sess.name.replace(' ', '_')}_{sess.id}.json"
        )
    elif format == "csv":
        csv_file = session_dir / "metrics.csv"
        if not csv_file.exists():
            ReportGenerator.export_csv(sess, csv_file)
        return FileResponse(
            str(csv_file),
            media_type="text/csv",
            filename=f"SprintIQ_{sess.name.replace(' ', '_')}_{sess.id}.csv"
        )
    elif format == "pdf":
        pdf_file = session_dir / "report.pdf"
        if not pdf_file.exists():
            try:
                ReportGenerator.export_pdf(sess, pdf_file)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
        return FileResponse(
            str(pdf_file),
            media_type="application/pdf",
            filename=f"SprintIQ_{sess.name.replace(' ', '_')}_{sess.id}.pdf"
        )

@app.delete("/api/analyses/{analysis_id}")
def delete_analysis(analysis_id: str):
    """Deletes an analysis session and associated files."""
    deleted = storage.delete(analysis_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Analysis session not found.")
    return {"message": "Analysis deleted successfully", "id": analysis_id}

@app.on_event("startup")
def startup_event():
    """Initializes sample demonstration dataset and ensures model is downloaded."""
    print("Initializing SprintIQ Backend & Sample Datasets...")
    try:
        # 1. Ensure MediaPipe model weights exist (e.g. for Render or fresh deployments)
        if not settings.MODEL_PATH.exists():
            print(f"Downloading MediaPipe pose landmarker model to {settings.MODEL_PATH}...")
            import urllib.request
            settings.MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(
                "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
                str(settings.MODEL_PATH)
            )
            print("MediaPipe model download complete.")

        sprint_sample = SAMPLES_DIR / "demo_sprint.mp4"
        jump_sample = SAMPLES_DIR / "demo_jump.mp4"
        if not sprint_sample.exists():
            SampleVideoGenerator.generate_sprint_demo(sprint_sample)
        if not jump_sample.exists():
            SampleVideoGenerator.generate_jump_demo(jump_sample)
        
        # Pre-process a sample sprint if no analyses exist yet
        if len(storage.get_all()) == 0:
            demo_id = "sample_sprint_demo_01"
            calib = SpatialCalibrator.compute_scale(
                known_distance_m=1.0,
                point1=[80.0, 420.0],
                point2=[170.0, 420.0],
                camera_view=CameraView.SIDE
            )
            initial_session = AnalysisSession(
                id=demo_id,
                name="Sample: 60m Sprint Acceleration",
                event_type=EventType.SPRINT,
                status=AnalysisStatus.QUEUED,
                progress_pct=0,
                status_message="Initial demonstration session loading...",
                created_at=datetime.utcnow().isoformat(),
                updated_at=datetime.utcnow().isoformat(),
                calibration=calib,
                video_relative_url=f"/api/media/samples/{sprint_sample.name}",
                is_sample=True,
            )
            storage.save(initial_session)
            # Run pipeline synchronously for the initial sample
            run_analysis_pipeline(demo_id, sprint_sample, sample_interval=1)
            print("Sample sprint demo pre-processed and ready!")

    except Exception as e:
        print(f"Startup sample initialization notice: {e}")
