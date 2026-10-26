import pytest
import numpy as np
from backend.models.schemas import (
    FrameLandmarks,
    LandmarkPoint,
    CalibrationConfig,
    CameraView,
)
from backend.core.calibration import SpatialCalibrator
from backend.core.biomechanics import BiomechanicsEngine
from backend.core.rule_engine import BiomechanicsRuleEngine

def test_spatial_calibrator_success():
    config = SpatialCalibrator.compute_scale(
        known_distance_m=2.0,
        point1=[100.0, 200.0],
        point2=[300.0, 200.0],  # 200 pixels distance
        camera_view=CameraView.SIDE,
    )
    assert config.is_calibrated is True
    assert config.pixels_per_meter == 100.0
    assert "Calibrated at 100.0 px/m" in config.calibration_note

def test_spatial_calibrator_uncalibrated_when_missing_points():
    config = SpatialCalibrator.compute_scale(
        known_distance_m=None,
        point1=None,
        point2=None,
    )
    assert config.is_calibrated is False
    assert config.pixels_per_meter is None
    assert "missing" in config.calibration_note.lower()

def test_sprint_cadence_calculation():
    # Construct synthetic frames with 4 distinct left foot strikes and 4 right foot strikes over 2.0s
    fps = 30.0
    num_frames = 60  # 2 seconds
    frames = []

    for i in range(num_frames):
        t = i / fps
        # Simulate ankle oscillation (1.6 Hz per leg = 3.2 Hz combined = 192 spm cadence)
        l_ankle_y = 0.8 + 0.1 * np.sin(2 * np.pi * 1.6 * t)
        r_ankle_y = 0.8 + 0.1 * np.sin(2 * np.pi * 1.6 * t + np.pi)

        landmarks = []
        for l_id in range(33):
            y_val = l_ankle_y if l_id in [27, 29, 31] else (r_ankle_y if l_id in [28, 30, 32] else 0.5)
            landmarks.append(LandmarkPoint(
                id=l_id,
                name=f"pt_{l_id}",
                x=0.1 + (i / num_frames) * 0.8,
                y=y_val,
                z=0.0,
                visibility=0.9,
                presence=0.9,
            ))

        frames.append(FrameLandmarks(
            frame_index=i,
            timestamp_s=t,
            landmarks=landmarks,
            mean_confidence=0.9,
            is_valid=True,
        ))

    calib = SpatialCalibrator.compute_scale(
        known_distance_m=10.0,
        point1=[100.0, 100.0],
        point2=[900.0, 100.0],
        camera_view=CameraView.SIDE,
    )

    metrics, events, time_series = BiomechanicsEngine.analyze_sprint(
        frame_records=frames,
        video_width=1000,
        video_height=600,
        fps=fps,
        calibration=calib,
    )

    assert metrics.pose_coverage_pct == 100.0
    assert metrics.total_steps > 0
    assert metrics.cadence_spm is not None
    assert 120 <= metrics.cadence_spm <= 240
    assert metrics.speed_calibrated is True
    assert metrics.avg_speed_mps is not None and metrics.avg_speed_mps > 0

def test_rule_engine_observations():
    # Verify observation generation
    calib = CalibrationConfig(is_calibrated=False)
    metrics, _, _ = BiomechanicsEngine.analyze_sprint([], 1000, 600, 30.0, calib)
    obs = BiomechanicsRuleEngine.evaluate_sprint(metrics, calib)
    assert any(o.category == "tracking" for o in obs)
    assert any(o.category == "velocity" for o in obs)
