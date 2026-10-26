import os
import csv
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from ..models.schemas import AnalysisSession, EventType

class ReportGenerator:
    @staticmethod
    def export_json(session: AnalysisSession, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(session.model_dump_json(indent=2))
        return output_path

    @staticmethod
    def export_csv(session: AnalysisSession, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            # Write header
            writer.writerow([
                "timestamp_s",
                "frame_index",
                "speed_mps",
                "hip_x_norm",
                "hip_y_norm",
                "left_ankle_y_norm",
                "right_ankle_y_norm",
                "tracking_confidence"
            ])
            for pt in session.time_series:
                writer.writerow([
                    pt.timestamp_s,
                    pt.frame_index,
                    pt.speed_mps if pt.speed_mps is not None else "",
                    pt.hip_x_norm,
                    pt.hip_y_norm,
                    pt.left_ankle_y_norm if pt.left_ankle_y_norm is not None else "",
                    pt.right_ankle_y_norm if pt.right_ankle_y_norm is not None else "",
                    pt.confidence
                ])
        return output_path

    @staticmethod
    def export_pdf(session: AnalysisSession, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom palette matching SprintIQ dark navy & electric mint
        navy_dark = colors.HexColor("#0B1120")
        card_bg = colors.HexColor("#0F172A")
        text_white = colors.HexColor("#F8FAFC")
        text_muted = colors.HexColor("#94A3B8")
        mint_green = colors.HexColor("#10E76E")
        cyan_accent = colors.HexColor("#06B6D4")
        border_color = colors.HexColor("#1E293B")

        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=colors.HexColor("#0B1120"),
            spaceAfter=6,
        )
        subtitle_style = ParagraphStyle(
            'SubTitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor("#475569"),
            spaceAfter=12,
        )
        heading_style = ParagraphStyle(
            'HeadingStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=10,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1E293B"),
        )
        bullet_style = ParagraphStyle(
            'BulletStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#334155"),
            spaceAfter=3,
        )

        story = []

        # Header banner
        story.append(Paragraph("<b>SprintIQ — Biomechanical Performance Report</b>", title_style))
        story.append(Paragraph("BITS Pilani Introduction to Sports Engineering (Assignment 2, Project 7) | Automated Computer Vision Analysis", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=mint_green, spaceBefore=2, spaceAfter=12))

        # Session Metadata Table
        vid_meta = session.video_metadata
        calib = session.calibration
        meta_data = [
            [
                Paragraph("<b>Session Name:</b>", body_style), Paragraph(session.name, body_style),
                Paragraph("<b>Date / ID:</b>", body_style), Paragraph(f"{session.created_at[:10]} ({session.id[:8]})", body_style),
            ],
            [
                Paragraph("<b>Event Type:</b>", body_style), Paragraph(session.event_type.value.upper(), body_style),
                Paragraph("<b>Video Duration:</b>", body_style), Paragraph(f"{vid_meta.duration_s if vid_meta else 'N/A'} s @ {vid_meta.fps if vid_meta else 'N/A'} FPS", body_style),
            ],
            [
                Paragraph("<b>Resolution:</b>", body_style), Paragraph(f"{vid_meta.width if vid_meta else 'N/A'} x {vid_meta.height if vid_meta else 'N/A'} px", body_style),
                Paragraph("<b>Camera View:</b>", body_style), Paragraph(calib.camera_view.value.capitalize(), body_style),
            ],
            [
                Paragraph("<b>Spatial Calibration:</b>", body_style), Paragraph(f"{calib.pixels_per_meter} px/m" if calib.is_calibrated else "Uncalibrated (Pixel metrics)", body_style),
                Paragraph("<b>Pose Coverage:</b>", body_style), Paragraph(f"{session.sprint_metrics.pose_coverage_pct if session.sprint_metrics else (session.jump_metrics.pose_coverage_pct if session.jump_metrics else 'N/A')}%", body_style),
            ],
        ]
        meta_table = Table(meta_data, colWidths=[110, 160, 110, 160])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))

        # KPI Metrics Table
        story.append(Paragraph("<b>Primary Biomechanical Parameters</b>", heading_style))
        kpi_rows = [["Metric", "Value", "Unit", "Method / Formula", "Status"]]
        
        if session.event_type == EventType.SPRINT and session.sprint_metrics:
            m = session.sprint_metrics
            kpi_rows.extend([
                ["Step Cadence", str(m.cadence_spm or "N/A"), "steps/min", "Cadence = (Detected Steps / Δt) * 60", "Valid" if m.cadence_spm else "Uncomputed"],
                ["Total Detected Steps", str(m.total_steps), "steps", "Ankle trajectory peak stance detection", "Detected"],
                ["Average Step Time", str(m.avg_step_time_s or "N/A"), "s", "Mean dt between alternating contacts", "Valid" if m.avg_step_time_s else "N/A"],
                ["Step Time Variability (SD)", str(m.step_time_std_s or "N/A"), "s", "Standard deviation of consecutive steps", "Valid" if m.step_time_std_s else "N/A"],
                ["Bilateral Symmetry Ratio", str(m.step_symmetry_ratio or "N/A"), "ratio", "Mean Left Step Time / Right Step Time", "Valid" if m.step_symmetry_ratio else "N/A"],
                ["Average Speed", f"{m.avg_speed_mps}" if m.avg_speed_mps else "Uncalibrated", "m/s", "Δx_m / Δt_s using planar calibration", "Calibrated" if m.speed_calibrated else "Missing Scale"],
                ["Estimated Peak Speed", f"{m.peak_speed_mps}" if m.peak_speed_mps else "Uncalibrated", "m/s", "95th percentile instantaneous speed", "Calibrated" if m.speed_calibrated else "Missing Scale"],
            ])
        elif session.event_type == EventType.JUMP and session.jump_metrics:
            jm = session.jump_metrics
            kpi_rows.extend([
                ["Estimated Flight Time", str(jm.flight_time_s or "N/A"), "s", "t_landing - t_takeoff", "Valid" if jm.flight_time_s else "N/A"],
                ["Take-off Timestamp", str(jm.takeoff_timestamp_s or "N/A"), "s", "Upward ballistic trajectory onset", "Detected" if jm.takeoff_timestamp_s else "N/A"],
                ["Landing Timestamp", str(jm.landing_timestamp_s or "N/A"), "s", "Downward contact re-establishment", "Detected" if jm.landing_timestamp_s else "N/A"],
                ["Horizontal Displacement", f"{jm.horizontal_displacement_m} m" if jm.displacement_calibrated else f"{jm.horizontal_displacement_px} px", "m / px", "|x_landing - x_takeoff| proxy", "Calibrated" if jm.displacement_calibrated else "Pixel Only"],
                ["Estimated Take-off Angle", f"{jm.takeoff_angle_deg}°" if jm.takeoff_angle_deg else "N/A", "deg", "arctan(v_y / v_x) at takeoff frame", "Estimated" if jm.takeoff_angle_deg else "N/A"],
                ["Peak Hip Elevation", f"{jm.peak_hip_height_px}", "px", "Max elevation above image baseline", "Computed"],
            ])

        kpi_table = Table(kpi_rows, colWidths=[130, 75, 55, 200, 80])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 8.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('FONTSIZE', (0,1), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 12))

        # Detected Events Timeline Table
        story.append(Paragraph("<b>Detected Movement Events Timeline</b>", heading_style))
        if session.events:
            event_rows = [["Time (s)", "Frame", "Event Name", "Confidence", "Analytical Note"]]
            for ev in session.events[:12]:  # Show up to 12 primary events
                event_rows.append([
                    f"{ev.timestamp_s:.3f}",
                    str(ev.frame_index),
                    ev.label,
                    f"{ev.confidence:.2f}",
                    ev.notes or ""
                ])
            ev_table = Table(event_rows, colWidths=[60, 50, 110, 65, 255])
            ev_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
                ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ]))
            story.append(ev_table)
        else:
            story.append(Paragraph("No discrete movement events met the minimum confidence threshold.", bullet_style))
        story.append(Spacer(1, 10))

        # Rule-based Observations
        story.append(Paragraph("<b>Biomechanical Observations & Analytical Findings</b>", heading_style))
        if session.observations:
            for obs in session.observations:
                prefix = "[FINDING]" if obs.severity == "success" else ("[NOTICE]" if obs.severity == "info" else "[LIMITATION]")
                text = f"<b>{prefix} {obs.title}:</b> {obs.description} <i>(Evidence: {obs.evidence})</i>"
                story.append(Paragraph(text, bullet_style))
        else:
            story.append(Paragraph("No qualitative observations available.", bullet_style))
        story.append(Spacer(1, 12))

        # Methodology & Limitations Disclaimer
        story.append(Paragraph("<b>Methodology & Measurement Limitations</b>", heading_style))
        disclaimer = (
            "This analysis was produced using SprintIQ, an engineering prototype developed for BITS Pilani Introduction to "
            "Sports Engineering (Assignment 2, Project 7). Processing applies OpenCV for frame decoding, MediaPipe Pose "
            "Landmarker (BlazePose 33-point topology) for human pose tracking, and SciPy Savitzky-Golay filtering for event "
            "extraction. Planar 2D kinematics assume perpendicular motion to the camera optical axis. Parallax, foreshortening, "
            "motion blur, and monocular depth ambiguity represent inherent measurement uncertainties. Speed is only calibrated "
            "when a physical 2-point reference scale is supplied."
        )
        story.append(Paragraph(disclaimer, bullet_style))

        doc.build(story)
        return output_path
