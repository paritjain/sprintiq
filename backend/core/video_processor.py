import os
from pathlib import Path
from typing import Tuple, Generator, Optional
import cv2
from ..models.schemas import VideoMetadata

class VideoProcessor:
    @staticmethod
    def get_metadata(video_path: Path) -> VideoMetadata:
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found at: {video_path}")

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"OpenCV could not open video: {video_path.name}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Guard against zero or corrupted fps
        if fps <= 0 or fps > 300:
            fps = 30.0  # reasonable fallback default with flag

        duration_s = total_frames / fps if fps > 0 else 0.0
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)

        cap.release()

        return VideoMetadata(
            filename=video_path.name,
            width=width,
            height=height,
            fps=round(fps, 2),
            total_frames=total_frames,
            duration_s=round(duration_s, 2),
            file_size_mb=round(file_size_mb, 2),
        )

    @staticmethod
    def extract_thumbnail(video_path: Path, output_image_path: Path) -> bool:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return False

        # Read ~15% into the video or first valid frame
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        target_frame = min(max(int(total_frames * 0.15), 0), total_frames - 1)
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)

        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()

        cap.release()

        if ret and frame is not None:
            output_image_path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(output_image_path), frame)
            return True
        return False

    @staticmethod
    def iter_frames(video_path: Path, sample_interval: int = 1) -> Generator[Tuple[int, float, cv2.Mat], None, None]:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0 or fps > 300:
            fps = 30.0

        frame_idx = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % sample_interval == 0:
                    timestamp_s = frame_idx / fps
                    yield frame_idx, timestamp_s, frame

                frame_idx += 1
        finally:
            cap.release()
