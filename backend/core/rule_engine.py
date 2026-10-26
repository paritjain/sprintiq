from typing import List
from ..models.schemas import (
    ObservationItem,
    SprintMetrics,
    JumpMetrics,
    CalibrationConfig,
    CameraView,
    EventType,
)

class BiomechanicsRuleEngine:
    @staticmethod
    def evaluate_sprint(
        metrics: SprintMetrics,
        calibration: CalibrationConfig,
    ) -> List[ObservationItem]:
        observations: List[ObservationItem] = []

        # 1. Pose Coverage and Tracking Quality
        if metrics.pose_coverage_pct < 65.0:
            observations.append(ObservationItem(
                category="tracking",
                severity="warning",
                title="Sub-optimal Pose Estimation Coverage",
                description="Pose landmark detection was successful in less than 65% of sampled frames. Occlusion, motion blur, or camera distance may degrade temporal precision.",
                evidence=f"Coverage is {metrics.pose_coverage_pct}% ({metrics.valid_frames_count}/{metrics.total_frames_analyzed} valid frames)."
            ))
        else:
            observations.append(ObservationItem(
                category="tracking",
                severity="success",
                title="Reliable Pose Tracking Continuity",
                description="High landmark retention across video frames enables robust kinematic segment tracking without frequent trajectory interpolation.",
                evidence=f"Pose detection coverage maintained across {metrics.pose_coverage_pct}% of frames."
            ))

        # 2. Calibration & Speed Validity
        if not calibration.is_calibrated:
            observations.append(ObservationItem(
                category="velocity",
                severity="info",
                title="Uncalibrated Velocity Assessment",
                description="Spatial scale calibration was not applied. Velocity in m/s is omitted to prevent scientifically invalid speed claims. Distance is relative to pixel space.",
                evidence="Calibration scale: missing (pixels_per_meter is null)."
            ))
        else:
            if calibration.camera_view == CameraView.FRONT:
                observations.append(ObservationItem(
                    category="velocity",
                    severity="warning",
                    title="Front-View Perspective Distortion",
                    description="Camera orientation was recorded as front view. Lateral pixel translation reflects foreshortened perspective rather than true horizontal trajectory.",
                    evidence=f"Camera view set to '{calibration.camera_view.value}'. Planar 2D calibration is only valid perpendicular to optical axis."
                ))
            elif metrics.avg_speed_mps:
                observations.append(ObservationItem(
                    category="velocity",
                    severity="info",
                    title="Calibrated Velocity Profile",
                    description=f"Estimated average forward velocity is {metrics.avg_speed_mps} m/s with an estimated peak of {metrics.peak_speed_mps or 'N/A'} m/s based on hip landmark displacement.",
                    evidence=f"Calculated from 2D planar reference scale of {calibration.pixels_per_meter} px/m."
                ))

        # 3. Cadence Evaluation
        if metrics.cadence_spm is not None:
            if metrics.cadence_spm < 160:
                observations.append(ObservationItem(
                    category="cadence",
                    severity="info",
                    title="Low Step Cadence Indicator",
                    description="Calculated step frequency is below standard sprint competition cadence (180–260 spm). May reflect acceleration phase, submaximal running, or overstriding tendencies.",
                    evidence=f"Measured cadence: {metrics.cadence_spm} steps/min over {metrics.total_steps} detected foot strikes."
                ))
            elif 180 <= metrics.cadence_spm <= 265:
                observations.append(ObservationItem(
                    category="cadence",
                    severity="success",
                    title="Optimal Sprinting Cadence Range",
                    description="Step frequency falls within the established elite sprint velocity development range (180–260 spm).",
                    evidence=f"Measured cadence: {metrics.cadence_spm} steps/min."
                ))
            else:
                observations.append(ObservationItem(
                    category="cadence",
                    severity="info",
                    title="High Step Frequency",
                    description="Step frequency is unusually high (>265 spm). Verify that video frame rate is accurate and steps are not double-counted due to ankle rebound.",
                    evidence=f"Cadence calculated at {metrics.cadence_spm} spm."
                ))

        # 4. Bilateral Step Symmetry
        if metrics.step_symmetry_ratio is not None:
            sym_diff = abs(metrics.step_symmetry_ratio - 1.0)
            if sym_diff > 0.15:
                observations.append(ObservationItem(
                    category="asymmetry",
                    severity="warning",
                    title="Bilateral Step Time Asymmetry Detected",
                    description="Temporal disparity between left and right step durations exceeds 15%. This indicates asymmetrical stance or swing phase timing.",
                    evidence=f"Left-to-right step timing ratio is {metrics.step_symmetry_ratio} (ideal bilateral symmetry is 1.00)."
                ))
            else:
                observations.append(ObservationItem(
                    category="asymmetry",
                    severity="success",
                    title="Balanced Bilateral Step Timing",
                    description="Contralateral step intervals show balanced temporal symmetry within a healthy 15% tolerance window.",
                    evidence=f"Step symmetry ratio: {metrics.step_symmetry_ratio}."
                ))

        # 5. Timing Consistency
        if metrics.step_time_std_s is not None and metrics.step_time_std_s > 0.08:
            observations.append(ObservationItem(
                category="cadence",
                severity="info",
                title="Moderate Step Time Variability",
                description="Higher variation in consecutive foot strike intervals. Typical during transitional phases (block clearance to upright sprinting) or rhythm disruption.",
                evidence=f"Step time standard deviation: {metrics.step_time_std_s} s (mean: {metrics.avg_step_time_s} s)."
            ))

        return observations

    @staticmethod
    def evaluate_jump(
        metrics: JumpMetrics,
        calibration: CalibrationConfig,
    ) -> List[ObservationItem]:
        observations: List[ObservationItem] = []

        # 1. Pose Coverage
        if metrics.pose_coverage_pct < 65.0:
            observations.append(ObservationItem(
                category="tracking",
                severity="warning",
                title="Reduced Tracking Visibility",
                description="Pose estimation coverage was below 65%. Rapid aerial movement and sandpit splash may cause landmark dropouts.",
                evidence=f"Coverage is {metrics.pose_coverage_pct}% ({metrics.valid_frames_count}/{metrics.total_frames_analyzed} frames)."
            ))
        else:
            observations.append(ObservationItem(
                category="tracking",
                severity="success",
                title="Robust Jump Trajectory Tracking",
                description="Hip and ankle landmarks were continuously tracked across the run-up, take-off, flight, and landing phases.",
                evidence=f"Pose detection coverage maintained across {metrics.pose_coverage_pct}% of frames."
            ))

        # 2. Flight Duration
        if metrics.flight_time_s is not None:
            if 0.45 <= metrics.flight_time_s <= 0.90:
                observations.append(ObservationItem(
                    category="jump_mechanics",
                    severity="success",
                    title="Plausible Aerial Flight Duration",
                    description="Flight time is consistent with competitive long jump mechanics (typically 0.50s to 0.85s depending on horizontal approach speed and vertical impulse).",
                    evidence=f"Flight time: {metrics.flight_time_s} s (Take-off: {metrics.takeoff_timestamp_s}s, Landing: {metrics.landing_timestamp_s}s)."
                ))
            else:
                observations.append(ObservationItem(
                    category="jump_mechanics",
                    severity="info",
                    title="Atypical Flight Time Measurement",
                    description="Estimated flight time is outside standard competitive windows. Verify take-off and landing event markers manually using the timeline tool.",
                    evidence=f"Recorded flight time: {metrics.flight_time_s} s."
                ))

        # 3. Horizontal Displacement
        if metrics.displacement_calibrated and metrics.horizontal_displacement_m:
            observations.append(ObservationItem(
                category="jump_mechanics",
                severity="info",
                title="Calibrated Horizontal Displacement",
                description="Horizontal translation estimated using hip midpoint proxy between detected take-off and landing frames.",
                evidence=f"Estimated displacement: {metrics.horizontal_displacement_m} m based on {calibration.pixels_per_meter} px/m."
            ))
        else:
            observations.append(ObservationItem(
                category="jump_mechanics",
                severity="warning",
                title="Displacement Uncalibrated (Pixel Domain Only)",
                description="Displacement cannot be reported in meters without spatial calibration. Pixel displacement alone does not represent official jump distance.",
                evidence=f"Raw horizontal hip displacement: {metrics.horizontal_displacement_px} px."
            ))

        # 4. Take-off Angle
        if metrics.takeoff_angle_deg is not None:
            if 17.0 <= metrics.takeoff_angle_deg <= 25.0:
                observations.append(ObservationItem(
                    category="jump_mechanics",
                    severity="success",
                    title="Optimal Take-off Angle Window",
                    description="Take-off projection angle aligns with biomechanical literature recommendations for maximizing long jump distance (18°–24°).",
                    evidence=f"Estimated projection angle: {metrics.takeoff_angle_deg}°."
                ))
            else:
                observations.append(ObservationItem(
                    category="jump_mechanics",
                    severity="info",
                    title="Take-off Projection Angle Assessment",
                    description="Estimated initial projection trajectory is outside the classical 18°–24° window. Steeper angles may trade forward velocity for excessive height.",
                    evidence=f"Estimated projection angle: {metrics.takeoff_angle_deg}°."
                ))

        return observations
