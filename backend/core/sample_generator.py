import os
import math
import cv2
import numpy as np
from pathlib import Path
from ..config import SAMPLES_DIR

class SampleVideoGenerator:
    """
    Generates realistic, physically plausible athletic demonstration videos
    rendered with OpenCV for sprint and long jump trials.
    Includes lane tracks, calibrated meter markers, and animated athletic kinematics.
    """

    @staticmethod
    def generate_sprint_demo(output_path: Path, duration_s: float = 3.5, fps: float = 30.0) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        w, h = 960, 540
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

        total_frames = int(duration_s * fps)
        ground_y = int(h * 0.78)

        # Athletic track colors
        track_color = (38, 48, 180)     # Brick red / terracotta BGR
        lane_line_color = (245, 245, 245)
        sky_color = (45, 30, 20)        # Deep evening sky
        grass_color = (34, 110, 45)

        for i in range(total_frames):
            frame = np.zeros((h, w, 3), dtype=np.uint8)
            # Background
            frame[0:ground_y, :] = sky_color
            frame[ground_y:, :] = track_color
            cv2.rectangle(frame, (0, ground_y - 40), (w, ground_y), grass_color, -1)

            # Lane markings and distance markers every 100px (~1 meter)
            cv2.line(frame, (0, ground_y), (w, ground_y), lane_line_color, 2)
            cv2.line(frame, (0, ground_y + 60), (w, ground_y + 60), lane_line_color, 2)

            for meter in range(0, 10):
                mx = 80 + meter * 90
                cv2.line(frame, (mx, ground_y - 10), (mx, ground_y + 20), (200, 200, 200), 2)
                cv2.putText(frame, f"{meter}m", (mx - 10, ground_y + 38), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)

            # Sprinter kinematics:
            # Progression across track from x=60 to x=880
            progress = i / total_frames
            sprinter_x = int(60 + progress * (w - 140))
            
            # Running cycle at ~3.2 Hz (192 spm cadence)
            cadence_hz = 3.2
            phase = 2 * math.pi * cadence_hz * (i / fps)

            # Vertical oscillation of pelvis
            bounce = int(math.sin(phase * 2) * 8)
            hip_y = ground_y - 110 + bounce
            hip_x = sprinter_x

            # Torso angle forward lean (~12 degrees)
            shoulder_x = hip_x + 14
            shoulder_y = hip_y - 75
            head_x = shoulder_x + 6
            head_y = shoulder_y - 30

            # Contralateral limb angles
            l_thigh_angle = math.sin(phase) * 0.75 + 0.15
            r_thigh_angle = -math.sin(phase) * 0.75 + 0.15

            thigh_len = 50
            shin_len = 52

            # Left leg
            l_knee_x = int(hip_x + math.sin(l_thigh_angle) * thigh_len)
            l_knee_y = int(hip_y + math.cos(l_thigh_angle) * thigh_len)
            l_foot_x = int(l_knee_x + math.sin(l_thigh_angle - 0.45) * shin_len)
            l_foot_y = int(min(l_knee_y + math.cos(l_thigh_angle - 0.45) * shin_len, ground_y))

            # Right leg
            r_knee_x = int(hip_x + math.sin(r_thigh_angle) * thigh_len)
            r_knee_y = int(hip_y + math.cos(r_thigh_angle) * thigh_len)
            r_foot_x = int(r_knee_x + math.sin(r_thigh_angle - 0.45) * shin_len)
            r_foot_y = int(min(r_knee_y + math.cos(r_thigh_angle - 0.45) * shin_len, ground_y))

            # Arms (opposite to legs)
            arm_len = 38
            l_elbow_x = int(shoulder_x - math.sin(l_thigh_angle) * arm_len)
            l_elbow_y = int(shoulder_y + math.cos(l_thigh_angle) * arm_len)
            l_hand_x = int(l_elbow_x + math.cos(l_thigh_angle) * arm_len)
            l_hand_y = int(l_elbow_y - math.sin(l_thigh_angle) * arm_len)

            r_elbow_x = int(shoulder_x + math.sin(l_thigh_angle) * arm_len)
            r_elbow_y = int(shoulder_y + math.cos(l_thigh_angle) * arm_len)
            r_hand_x = int(r_elbow_x - math.cos(l_thigh_angle) * arm_len)
            r_hand_y = int(r_elbow_y + math.sin(l_thigh_angle) * arm_len)

            # Draw Runner (Silhouette with colored sports singlet)
            # Legs back
            cv2.line(frame, (hip_x, hip_y), (l_knee_x, l_knee_y), (180, 180, 190), 8)
            cv2.line(frame, (l_knee_x, l_knee_y), (l_foot_x, l_foot_y), (160, 160, 170), 7)
            cv2.circle(frame, (l_foot_x, l_foot_y), 6, (0, 200, 255), -1)

            # Torso
            cv2.line(frame, (hip_x, hip_y), (shoulder_x, shoulder_y), (30, 200, 100), 16)

            # Head
            cv2.circle(frame, (head_x, head_y), 16, (220, 210, 190), -1)

            # Arms
            cv2.line(frame, (shoulder_x, shoulder_y), (l_elbow_x, l_elbow_y), (220, 210, 190), 6)
            cv2.line(frame, (l_elbow_x, l_elbow_y), (l_hand_x, l_hand_y), (220, 210, 190), 5)
            cv2.line(frame, (shoulder_x, shoulder_y), (r_elbow_x, r_elbow_y), (200, 190, 170), 6)
            cv2.line(frame, (r_elbow_x, r_elbow_y), (r_hand_x, r_hand_y), (200, 190, 170), 5)

            # Front Leg
            cv2.line(frame, (hip_x, hip_y), (r_knee_x, r_knee_y), (230, 230, 240), 9)
            cv2.line(frame, (r_knee_x, r_knee_y), (r_foot_x, r_foot_y), (210, 210, 220), 8)
            cv2.circle(frame, (r_foot_x, r_foot_y), 6, (0, 255, 128), -1)

            # SprintIQ HUD overlay
            cv2.putText(frame, "SprintIQ Kinematic Test Capture", (24, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (16, 231, 110), 2)
            cv2.putText(frame, f"t = {i / fps:.2f}s | Frame {i}", (24, 64), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

            out.write(frame)

        out.release()
        return output_path

    @staticmethod
    def generate_jump_demo(output_path: Path, duration_s: float = 3.5, fps: float = 30.0) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        w, h = 960, 540
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

        total_frames = int(duration_s * fps)
        ground_y = int(h * 0.78)

        # Athletic arena colors
        sky_color = (30, 25, 20)
        runway_color = (40, 55, 160)
        sand_color = (130, 190, 225)     # Sand pit BGR

        takeoff_board_x = 350
        sand_start_x = 400

        for i in range(total_frames):
            frame = np.zeros((h, w, 3), dtype=np.uint8)
            frame[0:ground_y, :] = sky_color
            frame[ground_y:, 0:sand_start_x] = runway_color
            frame[ground_y:, sand_start_x:] = sand_color

            # Take-off board (white wooden board)
            cv2.rectangle(frame, (takeoff_board_x, ground_y - 2), (takeoff_board_x + 25, ground_y + 12), (255, 255, 255), -1)
            cv2.putText(frame, "TAKEOFF BOARD", (takeoff_board_x - 30, ground_y + 36), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

            # Jump distance grid in sand
            for dist in range(1, 6):
                dx = sand_start_x + dist * 95
                cv2.line(frame, (dx, ground_y), (dx, ground_y + 40), (80, 140, 180), 2)
                cv2.putText(frame, f"{dist}.0m", (dx - 12, ground_y + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (40, 80, 110), 1)

            # Kinematic phases:
            # 1. Approach run (frames 0 to 40)
            # 2. Flight ballistic parabola (frames 41 to 75)
            # 3. Landing & deceleration (frames 76 to end)
            t = i / fps
            takeoff_t = 1.35  # ~frame 40
            landing_t = 2.05  # ~frame 62 (flight time ~0.70s)

            if t < takeoff_t:
                # Approach
                progress = t / takeoff_t
                hip_x = int(60 + progress * (takeoff_board_x - 60))
                hip_y = ground_y - 105 + int(math.sin(t * 18) * 6)
                flight_phase = False
            elif t <= landing_t:
                # Ballistic parabolic flight
                tau = (t - takeoff_t) / (landing_t - takeoff_t)
                hip_x = int(takeoff_board_x + tau * (sand_start_x + 360 - takeoff_board_x))
                # Parabola: 4 * h_max * tau * (1 - tau)
                h_apex = 95
                parabola = 4 * h_apex * tau * (1 - tau)
                hip_y = int(ground_y - 105 - parabola)
                flight_phase = True
            else:
                # Landed in sand
                hip_x = int(sand_start_x + 360)
                hip_y = ground_y - 65
                flight_phase = False

            # Draw Jumper
            torso_color = (0, 220, 240) if flight_phase else (40, 180, 240)
            shoulder_x = hip_x + (15 if not flight_phase else 5)
            shoulder_y = hip_y - 65
            head_x = shoulder_x + 4
            head_y = shoulder_y - 25

            # Body posture in flight (Hitch-kick / hang flight posture)
            if flight_phase:
                tau = (t - takeoff_t) / (landing_t - takeoff_t)
                leg_angle = -0.4 + tau * 1.3
                knee_x = int(hip_x + math.sin(leg_angle) * 45)
                knee_y = int(hip_y + math.cos(leg_angle) * 45)
                foot_x = int(knee_x + math.sin(leg_angle + 0.3) * 45)
                foot_y = int(knee_y + math.cos(leg_angle + 0.3) * 45)
            else:
                knee_x = hip_x - 10
                knee_y = hip_y + 45
                foot_x = knee_x
                foot_y = min(knee_y + 45, ground_y)

            cv2.line(frame, (hip_x, hip_y), (shoulder_x, shoulder_y), torso_color, 15)
            cv2.circle(frame, (head_x, head_y), 15, (230, 220, 200), -1)
            cv2.line(frame, (hip_x, hip_y), (knee_x, knee_y), (220, 220, 230), 8)
            cv2.line(frame, (knee_x, knee_y), (foot_x, foot_y), (200, 200, 215), 7)
            cv2.circle(frame, (foot_x, foot_y), 6, (16, 231, 110), -1)

            # HUD
            cv2.putText(frame, "SprintIQ Long Jump Kinematic Analysis", (24, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (6, 182, 212), 2)
            state_str = "FLIGHT PHASE" if flight_phase else ("APPROACH" if t < takeoff_t else "LANDING")
            cv2.putText(frame, f"t = {t:.2f}s | {state_str}", (24, 64), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)

            out.write(frame)

        out.release()
        return output_path
