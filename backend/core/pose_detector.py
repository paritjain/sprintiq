import cv2
import numpy as np
from pathlib import Path
from typing import List, Optional, Tuple
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from ..models.schemas import LandmarkPoint, FrameLandmarks
from ..config import settings

# 33 MediaPipe Pose Landmark names
LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer",
    "right_eye_inner", "right_eye", "right_eye_outer",
    "left_ear", "right_ear", "mouth_left", "mouth_right",
    "left_shoulder", "right_shoulder",
    "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_pinky", "right_pinky",
    "left_index", "right_index",
    "left_thumb", "right_thumb",
    "left_hip", "right_hip",
    "left_knee", "right_knee",
    "left_ankle", "right_ankle",
    "left_heel", "right_heel",
    "left_foot_index", "right_foot_index"
]

# Standard skeletal connection pairs (index tuples)
SKELETON_CONNECTIONS = [
    (11, 12),  # Shoulders
    (11, 13), (13, 15),  # Left arm
    (12, 14), (14, 16),  # Right arm
    (11, 23), (12, 24),  # Torso sides
    (23, 24),  # Hips
    (23, 25), (25, 27), (27, 29), (29, 31), (27, 31),  # Left leg & foot
    (24, 26), (26, 28), (28, 30), (30, 32), (28, 32),  # Right leg & foot
]

class PoseDetector:
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or settings.MODEL_PATH
        if not self.model_path.exists():
            raise FileNotFoundError(f"MediaPipe Pose model not found at: {self.model_path}")

        base_options = python.BaseOptions(model_asset_path=str(self.model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False,
            running_mode=vision.RunningMode.IMAGE,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.landmarker = vision.PoseLandmarker.create_from_options(options)

    def process_frame(self, frame_bgr: np.ndarray, frame_index: int, timestamp_s: float) -> FrameLandmarks:
        """Process a single frame and extract 33 pose landmarks."""
        rgb_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        detection_result = self.landmarker.detect(mp_image)

        if not detection_result.pose_landmarks or len(detection_result.pose_landmarks) == 0:
            return FrameLandmarks(
                frame_index=frame_index,
                timestamp_s=round(timestamp_s, 4),
                landmarks=[],
                mean_confidence=0.0,
                is_valid=False
            )

        pose = detection_result.pose_landmarks[0]
        landmark_list: List[LandmarkPoint] = []
        confidences: List[float] = []

        for idx, lm in enumerate(pose):
            name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"point_{idx}"
            visibility = float(getattr(lm, "visibility", 1.0) or 1.0)
            presence = float(getattr(lm, "presence", 1.0) or 1.0)
            conf = (visibility + presence) / 2.0
            confidences.append(conf)

            landmark_list.append(LandmarkPoint(
                id=idx,
                name=name,
                x=float(lm.x),
                y=float(lm.y),
                z=float(lm.z),
                visibility=round(visibility, 4),
                presence=round(presence, 4),
            ))

        mean_conf = float(np.mean(confidences)) if confidences else 0.0
        # A frame is valid if average confidence is >= 0.5 and key lower-body landmarks (hips & ankles) are tracked
        is_valid = mean_conf >= 0.45 and len(landmark_list) >= 33

        return FrameLandmarks(
            frame_index=frame_index,
            timestamp_s=round(timestamp_s, 4),
            landmarks=landmark_list,
            mean_confidence=round(mean_conf, 4),
            is_valid=is_valid
        )

    @staticmethod
    def draw_skeleton(frame_bgr: np.ndarray, landmarks: List[LandmarkPoint]) -> np.ndarray:
        """Renders biomechanical skeleton with electric lime and cyan lines on frame."""
        if not landmarks or len(landmarks) < 33:
            return frame_bgr

        annotated = frame_bgr.copy()
        h, w = annotated.shape[:2]

        pts = {}
        for lm in landmarks:
            px = int(lm.x * w)
            py = int(lm.y * h)
            pts[lm.id] = (px, py, lm.visibility)

        # Draw connection lines (Electric Lime BGR: (110, 231, 16), Cyan BGR: (212, 182, 6))
        for start_id, end_id in SKELETON_CONNECTIONS:
            if start_id in pts and end_id in pts:
                p1, p2 = pts[start_id], pts[end_id]
                if p1[2] > 0.4 and p2[2] > 0.4:
                    color = (212, 182, 6) if start_id >= 23 or end_id >= 23 else (110, 231, 16)
                    cv2.line(annotated, (p1[0], p1[1]), (p2[0], p2[1]), color, 2, cv2.LINE_AA)

        # Draw landmark joints
        for lm_id, (px, py, vis) in pts.items():
            if vis > 0.4:
                # Key joints: hips (23,24), knees (25,26), ankles (27,28) get larger highlight rings
                is_key = lm_id in [23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
                radius = 5 if is_key else 3
                inner_color = (255, 255, 255)
                outer_color = (110, 231, 16) if not is_key else (0, 255, 255)
                cv2.circle(annotated, (px, py), radius + 1, outer_color, -1, cv2.LINE_AA)
                cv2.circle(annotated, (px, py), radius - 1, inner_color, -1, cv2.LINE_AA)

        return annotated

    def close(self):
        if hasattr(self, "landmarker") and self.landmarker:
            self.landmarker.close()
