import numpy as np
from scipy.signal import find_peaks, savgol_filter
from typing import List, Dict, Any, Tuple, Optional
from ..models.schemas import (
    FrameLandmarks,
    MovementEvent,
    SprintMetrics,
    JumpMetrics,
    TimeSeriesPoint,
    CalibrationConfig,
    CameraView,
)

class BiomechanicsEngine:
    @staticmethod
    def analyze_sprint(
        frame_records: List[FrameLandmarks],
        video_width: int,
        video_height: int,
        fps: float,
        calibration: CalibrationConfig,
    ) -> Tuple[SprintMetrics, List[MovementEvent], List[TimeSeriesPoint]]:
        if not frame_records:
            return SprintMetrics(), [], []

        total_frames = len(frame_records)
        valid_frames = [f for f in frame_records if f.is_valid and len(f.landmarks) >= 33]
        coverage_pct = round((len(valid_frames) / total_frames) * 100, 2) if total_frames > 0 else 0.0

        if len(valid_frames) < 10:
            # Insufficient valid landmarks to conduct scientifically defensible biomechanical analysis
            return (
                SprintMetrics(
                    pose_coverage_pct=coverage_pct,
                    valid_frames_count=len(valid_frames),
                    total_frames_analyzed=total_frames,
                ),
                [],
                [],
            )

        # Extract time-series for Hip Midpoint (indices 23 & 24) and Ankles (27 Left, 28 Right)
        timestamps = []
        frame_indices = []
        hip_x_px = []
        hip_y_px = []
        left_ankle_y_px = []
        right_ankle_y_px = []
        confidences = []

        for f in frame_records:
            timestamps.append(f.timestamp_s)
            frame_indices.append(f.frame_index)
            confidences.append(f.mean_confidence)

            if f.is_valid and len(f.landmarks) >= 33:
                # Hip midpoint proxy
                lh = f.landmarks[23]
                rh = f.landmarks[24]
                hx = ((lh.x + rh.x) / 2.0) * video_width
                hy = ((lh.y + rh.y) / 2.0) * video_height

                la_y = f.landmarks[27].y * video_height
                ra_y = f.landmarks[28].y * video_height
            else:
                hx = np.nan
                hy = np.nan
                la_y = np.nan
                ra_y = np.nan

            hip_x_px.append(hx)
            hip_y_px.append(hy)
            left_ankle_y_px.append(la_y)
            right_ankle_y_px.append(ra_y)

        timestamps = np.array(timestamps)
        hip_x_px = np.array(hip_x_px)
        hip_y_px = np.array(hip_y_px)
        left_ankle_y_px = np.array(left_ankle_y_px)
        right_ankle_y_px = np.array(right_ankle_y_px)

        # Interpolate NaNs if missing frames exist
        def clean_series(series: np.ndarray) -> np.ndarray:
            nans = np.isnan(series)
            if np.all(nans):
                return np.zeros_like(series)
            x = lambda z: z.nonzero()[0]
            series_clean = series.copy()
            series_clean[nans] = np.interp(x(nans), x(~nans), series[~nans])
            return series_clean

        hip_x_clean = clean_series(hip_x_px)
        hip_y_clean = clean_series(hip_y_px)
        left_ankle_clean = clean_series(left_ankle_y_px)
        right_ankle_clean = clean_series(right_ankle_y_px)

        # Apply Savitzky-Golay smoothing where possible
        win_len = min(9, len(timestamps) if len(timestamps) % 2 != 0 else len(timestamps) - 1)
        if win_len >= 5:
            left_ankle_smooth = savgol_filter(left_ankle_clean, window_length=win_len, polyorder=2)
            right_ankle_smooth = savgol_filter(right_ankle_clean, window_length=win_len, polyorder=2)
            hip_x_smooth = savgol_filter(hip_x_clean, window_length=win_len, polyorder=2)
        else:
            left_ankle_smooth = left_ankle_clean
            right_ankle_smooth = right_ankle_clean
            hip_x_smooth = hip_x_clean

        # Step Event Detection:
        # In side-view sprinting, ground strike corresponds to the maximum vertical position (highest y in image space, since y=0 is top)
        # of the ankle/foot complex before lift-off.
        # Enforce minimum distance between consecutive steps of the same foot: at least 0.28s (max 214 steps/min per foot)
        min_distance_frames = max(int(fps * 0.28), 3)

        # Detect left foot ground strikes (peaks in y coordinate)
        prominence_y = max((np.max(left_ankle_smooth) - np.min(left_ankle_smooth)) * 0.15, 5.0)
        left_peaks, _ = find_peaks(left_ankle_smooth, distance=min_distance_frames, prominence=prominence_y)
        
        # Detect right foot ground strikes
        prominence_yr = max((np.max(right_ankle_smooth) - np.min(right_ankle_smooth)) * 0.15, 5.0)
        right_peaks, _ = find_peaks(right_ankle_smooth, distance=min_distance_frames, prominence=prominence_yr)

        # Combine and order detected events chronologically
        events: List[MovementEvent] = []
        for p in left_peaks:
            events.append(MovementEvent(
                event_id=f"step-left-{frame_indices[p]}",
                type="step_left",
                label="Left Foot Strike",
                timestamp_s=round(float(timestamps[p]), 3),
                frame_index=int(frame_indices[p]),
                confidence=round(float(confidences[p]), 3),
                notes="Detected peak ankle ground contact phase"
            ))

        for p in right_peaks:
            events.append(MovementEvent(
                event_id=f"step-right-{frame_indices[p]}",
                type="step_right",
                label="Right Foot Strike",
                timestamp_s=round(float(timestamps[p]), 3),
                frame_index=int(frame_indices[p]),
                confidence=round(float(confidences[p]), 3),
                notes="Detected peak ankle ground contact phase"
            ))

        events.sort(key=lambda e: e.timestamp_s)

        total_steps = len(events)
        elapsed_time_s = float(timestamps[-1] - timestamps[0]) if len(timestamps) > 1 else 1.0

        # Cadence: (steps / time_in_seconds) * 60
        cadence_spm = round((total_steps / elapsed_time_s) * 60.0, 1) if elapsed_time_s > 0.5 and total_steps > 0 else None

        # Step and stride timings
        step_times = []
        left_step_times = []
        right_step_times = []
        stride_times = []

        for i in range(1, len(events)):
            dt = events[i].timestamp_s - events[i - 1].timestamp_s
            if 0.1 <= dt <= 1.2:
                step_times.append(dt)
                if events[i].type == "step_left":
                    left_step_times.append(dt)
                else:
                    right_step_times.append(dt)

        # Stride time (same foot consecutive contacts)
        for i in range(2, len(events)):
            if events[i].type == events[i - 2].type:
                dt_stride = events[i].timestamp_s - events[i - 2].timestamp_s
                if 0.3 <= dt_stride <= 2.0:
                    stride_times.append(dt_stride)

        avg_step_time = round(float(np.mean(step_times)), 3) if step_times else None
        step_time_std = round(float(np.std(step_times)), 3) if len(step_times) >= 2 else None
        avg_stride_time = round(float(np.mean(stride_times)), 3) if stride_times else None

        symmetry_ratio = None
        if left_step_times and right_step_times:
            mean_l = float(np.mean(left_step_times))
            mean_r = float(np.mean(right_step_times))
            if mean_r > 0:
                symmetry_ratio = round(mean_l / mean_r, 3)

        # Calibrated Speed calculations
        avg_speed_mps = None
        peak_speed_mps = None
        speed_calibrated = False

        instantaneous_speeds: List[Optional[float]] = []

        if calibration.is_calibrated and calibration.pixels_per_meter and calibration.pixels_per_meter > 0:
            speed_calibrated = True
            ppm = calibration.pixels_per_meter

            # Calculate displacement in meters
            dx_m = np.abs(np.diff(hip_x_smooth)) / ppm
            dt_s = np.diff(timestamps)
            # Avoid division by zero
            dt_s[dt_s <= 0] = 1.0 / fps

            inst_speed = dx_m / dt_s
            # Filter noise spikes using 95th percentile clipping
            inst_speed_smooth = savgol_filter(inst_speed, window_length=min(7, len(inst_speed) if len(inst_speed) % 2 != 0 else len(inst_speed) - 1), polyorder=1) if len(inst_speed) >= 7 else inst_speed

            total_dist_m = float(np.abs(hip_x_smooth[-1] - hip_x_smooth[0]) / ppm)
            avg_speed_mps = round(total_dist_m / elapsed_time_s, 2) if elapsed_time_s > 0 else 0.0
            peak_speed_mps = round(float(np.percentile(inst_speed_smooth, 95)), 2) if len(inst_speed_smooth) > 0 else avg_speed_mps

            # Pad one element to match length of timestamps
            instantaneous_speeds = [round(float(s), 2) for s in inst_speed_smooth]
            instantaneous_speeds.append(instantaneous_speeds[-1] if instantaneous_speeds else 0.0)
        else:
            instantaneous_speeds = [None] * len(timestamps)

        # Build time-series points
        time_series: List[TimeSeriesPoint] = []
        for idx in range(len(timestamps)):
            time_series.append(TimeSeriesPoint(
                timestamp_s=round(float(timestamps[idx]), 3),
                frame_index=int(frame_indices[idx]),
                speed_mps=instantaneous_speeds[idx] if idx < len(instantaneous_speeds) else None,
                hip_x_norm=round(float(hip_x_clean[idx] / video_width), 4),
                hip_y_norm=round(float(hip_y_clean[idx] / video_height), 4),
                left_ankle_y_norm=round(float(left_ankle_clean[idx] / video_height), 4),
                right_ankle_y_norm=round(float(right_ankle_clean[idx] / video_height), 4),
                confidence=round(float(confidences[idx]), 3),
            ))

        sprint_metrics = SprintMetrics(
            avg_speed_mps=avg_speed_mps,
            peak_speed_mps=peak_speed_mps,
            speed_calibrated=speed_calibrated,
            cadence_spm=cadence_spm,
            total_steps=total_steps,
            avg_step_time_s=avg_step_time,
            step_time_std_s=step_time_std,
            avg_stride_time_s=avg_stride_time,
            step_symmetry_ratio=symmetry_ratio,
            pose_coverage_pct=coverage_pct,
            valid_frames_count=len(valid_frames),
            total_frames_analyzed=total_frames,
        )

        return sprint_metrics, events, time_series

    @staticmethod
    def analyze_jump(
        frame_records: List[FrameLandmarks],
        video_width: int,
        video_height: int,
        fps: float,
        calibration: CalibrationConfig,
    ) -> Tuple[JumpMetrics, List[MovementEvent], List[TimeSeriesPoint]]:
        if not frame_records:
            return JumpMetrics(), [], []

        total_frames = len(frame_records)
        valid_frames = [f for f in frame_records if f.is_valid and len(f.landmarks) >= 33]
        coverage_pct = round((len(valid_frames) / total_frames) * 100, 2) if total_frames > 0 else 0.0

        if len(valid_frames) < 10:
            return (
                JumpMetrics(
                    pose_coverage_pct=coverage_pct,
                    valid_frames_count=len(valid_frames),
                    total_frames_analyzed=total_frames,
                ),
                [],
                [],
            )

        timestamps = []
        frame_indices = []
        hip_x_px = []
        hip_y_px = []
        confidences = []

        for f in frame_records:
            timestamps.append(f.timestamp_s)
            frame_indices.append(f.frame_index)
            confidences.append(f.mean_confidence)

            if f.is_valid and len(f.landmarks) >= 33:
                lh = f.landmarks[23]
                rh = f.landmarks[24]
                hx = ((lh.x + rh.x) / 2.0) * video_width
                hy = ((lh.y + rh.y) / 2.0) * video_height
            else:
                hx = np.nan
                hy = np.nan

            hip_x_px.append(hx)
            hip_y_px.append(hy)

        timestamps = np.array(timestamps)
        hip_x_px = np.array(hip_x_px)
        hip_y_px = np.array(hip_y_px)

        # Interpolate NaNs
        nans_x = np.isnan(hip_x_px)
        if not np.all(nans_x):
            x_ind = lambda z: z.nonzero()[0]
            hip_x_px[nans_x] = np.interp(x_ind(nans_x), x_ind(~nans_x), hip_x_px[~nans_x])
            hip_y_px[nans_x] = np.interp(x_ind(nans_x), x_ind(~nans_x), hip_y_px[~nans_x])

        win_len = min(9, len(timestamps) if len(timestamps) % 2 != 0 else len(timestamps) - 1)
        if win_len >= 5:
            hip_y_smooth = savgol_filter(hip_y_px, window_length=win_len, polyorder=2)
            hip_x_smooth = savgol_filter(hip_x_px, window_length=win_len, polyorder=2)
        else:
            hip_y_smooth = hip_y_px
            hip_x_smooth = hip_x_px

        # In image coordinates, hip height apex corresponds to minimum in y
        apex_idx = int(np.argmin(hip_y_smooth))
        min_hip_y = float(hip_y_smooth[apex_idx])

        # Candidate Take-off: search before apex where vertical upward velocity starts sharp descent
        # or local minimum in elevation before upward flight
        takeoff_idx = 0
        landing_idx = len(hip_y_smooth) - 1

        if apex_idx > 2:
            # Take-off is the inflection point or valley before apex
            takeoff_candidates = np.where(hip_y_smooth[:apex_idx] > min_hip_y + 15.0)[0]
            if len(takeoff_candidates) > 0:
                takeoff_idx = int(takeoff_candidates[-1])

        if apex_idx < len(hip_y_smooth) - 3:
            # Landing is when athlete returns to ground height
            landing_candidates = np.where(hip_y_smooth[apex_idx:] > min_hip_y + 15.0)[0]
            if len(landing_candidates) > 0:
                landing_idx = apex_idx + int(landing_candidates[0])

        takeoff_time = float(timestamps[takeoff_idx])
        landing_time = float(timestamps[landing_idx])
        flight_time_s = round(max(landing_time - takeoff_time, 0.0), 3)

        # Horizontal displacement (px)
        disp_px = round(float(abs(hip_x_smooth[landing_idx] - hip_x_smooth[takeoff_idx])), 2)

        # Displacement in meters if calibrated
        disp_m = None
        is_calibrated = False
        if calibration.is_calibrated and calibration.pixels_per_meter and calibration.pixels_per_meter > 0:
            is_calibrated = True
            disp_m = round(disp_px / calibration.pixels_per_meter, 2)

        # Estimate Takeoff Angle (approximate planar trajectory launch vector)
        takeoff_angle = None
        if takeoff_idx < len(hip_x_smooth) - 2:
            dt = timestamps[takeoff_idx + 1] - timestamps[takeoff_idx]
            if dt > 0:
                vx = (hip_x_smooth[takeoff_idx + 1] - hip_x_smooth[takeoff_idx]) / dt
                # vy inverted because image y increases downwards
                vy = -(hip_y_smooth[takeoff_idx + 1] - hip_y_smooth[takeoff_idx]) / dt
                if vx != 0:
                    rad = np.arctan2(vy, abs(vx))
                    takeoff_angle = round(float(np.degrees(rad)), 1)

        events: List[MovementEvent] = [
            MovementEvent(
                event_id=f"takeoff-{frame_indices[takeoff_idx]}",
                type="takeoff",
                label="Take-off",
                timestamp_s=round(takeoff_time, 3),
                frame_index=int(frame_indices[takeoff_idx]),
                confidence=round(float(confidences[takeoff_idx]), 3),
                notes="Candidate take-off point: upward ballistic flight phase initiation"
            ),
            MovementEvent(
                event_id=f"apex-{frame_indices[apex_idx]}",
                type="apex",
                label="Flight Apex",
                timestamp_s=round(float(timestamps[apex_idx]), 3),
                frame_index=int(frame_indices[apex_idx]),
                confidence=round(float(confidences[apex_idx]), 3),
                notes="Maximum hip proxy elevation reached during flight phase"
            ),
            MovementEvent(
                event_id=f"landing-{frame_indices[landing_idx]}",
                type="landing",
                label="Landing",
                timestamp_s=round(landing_time, 3),
                frame_index=int(frame_indices[landing_idx]),
                confidence=round(float(confidences[landing_idx]), 3),
                notes="Candidate landing point: ground contact re-established"
            )
        ]

        # Time series
        time_series: List[TimeSeriesPoint] = []
        for idx in range(len(timestamps)):
            time_series.append(TimeSeriesPoint(
                timestamp_s=round(float(timestamps[idx]), 3),
                frame_index=int(frame_indices[idx]),
                speed_mps=None,
                hip_x_norm=round(float(hip_x_smooth[idx] / video_width), 4),
                hip_y_norm=round(float(hip_y_smooth[idx] / video_height), 4),
                confidence=round(float(confidences[idx]), 3),
            ))

        jump_metrics = JumpMetrics(
            flight_time_s=flight_time_s,
            takeoff_timestamp_s=round(takeoff_time, 3),
            landing_timestamp_s=round(landing_time, 3),
            horizontal_displacement_m=disp_m,
            horizontal_displacement_px=disp_px,
            displacement_calibrated=is_calibrated,
            peak_hip_height_px=round(video_height - min_hip_y, 2),
            takeoff_angle_deg=takeoff_angle,
            pose_coverage_pct=coverage_pct,
            valid_frames_count=len(valid_frames),
            total_frames_analyzed=total_frames,
        )

        return jump_metrics, events, time_series
