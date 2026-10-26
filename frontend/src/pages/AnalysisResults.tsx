import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { AnalysisSession, FrameLandmarks } from '../types';
import { VideoPosePlayer } from '../components/video/VideoPosePlayer';
import { KpiCard } from '../components/analytics/KpiCard';
import { SpeedTimeChart, TrajectoryChart } from '../components/analytics/Charts';
import { EventTimeline } from '../components/analytics/EventTimeline';
import {
  Zap,
  Activity,
  Download,
  FileText,
  Clock,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Camera,
  RefreshCw,
  Share2,
} from 'lucide-react';

export const AnalysisResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [landmarks, setLandmarks] = useState<FrameLandmarks[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab: 'summary' | 'tracking' | 'biomechanics' | 'timeline' | 'report'
  const [activeTab, setActiveTab] = useState<'summary' | 'tracking' | 'biomechanics' | 'timeline' | 'report'>('summary');
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [externalSeekTime, setExternalSeekTime] = useState<number | null>(null);

  const fetchSession = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getAnalysis(id);
      setSession(data);

      // Fetch landmarks
      try {
        const lms = await ApiService.getLandmarks(id);
        setLandmarks(lms);
      } catch {
        // Landmarks might still be building if in progress
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  if (loading) {
    return (
      <div className="p-16 rounded-3xl bg-card border border-surfaceBorder text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
        <h3 className="text-lg font-bold text-white">Loading Biomechanical Analysis...</h3>
        <p className="text-xs text-slate-400 font-mono">Fetching session metadata and pose coordinates from backend</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-12 rounded-3xl bg-card border border-rose-500/30 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
        <h3 className="text-lg font-bold text-white">Analysis Session Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{error || 'Session not found'}</p>
        <Link
          to="/analyze"
          className="inline-block px-5 py-2.5 rounded-xl bg-primary text-slate-950 font-bold text-xs"
        >
          Create New Analysis
        </Link>
      </div>
    );
  }

  const isSprint = session.event_type === 'sprint';
  const sm = session.sprint_metrics;
  const jm = session.jump_metrics;
  const meta = session.video_metadata;
  const calib = session.calibration;

  return (
    <div className="space-y-6 pb-12">
      {/* Session Title Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-surfaceBorder shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-cyanAccent border border-slate-700">
              {session.event_type} Analysis
            </span>
            {session.is_sample && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Sample Data
              </span>
            )}
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                session.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 animate-pulse'
              }`}
            >
              {session.status}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {session.name}
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-mono flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={13} /> {new Date(session.created_at).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} /> {meta?.duration_s || 0}s @ {meta?.fps || 30} FPS
            </span>
            <span className="flex items-center gap-1">
              <Camera size={13} /> {calib.camera_view.toUpperCase()} VIEW
            </span>
            <span>
              Scale: {calib.is_calibrated ? `${calib.pixels_per_meter} px/m` : 'Uncalibrated'}
            </span>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={ApiService.getExportUrl(session.id, 'pdf')}
            download
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            title="Download PDF Biomechanical Report"
          >
            <Download size={14} className="text-primary" />
            <span>PDF Report</span>
          </a>
          <a
            href={ApiService.getExportUrl(session.id, 'csv')}
            download
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            title="Download Raw CSV Kinematics"
          >
            <Download size={14} className="text-cyanAccent" />
            <span>CSV</span>
          </a>
          <a
            href={ApiService.getExportUrl(session.id, 'json')}
            download
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            title="Download Complete JSON Results"
          >
            <Download size={14} className="text-slate-400" />
            <span>JSON</span>
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-surfaceBorder overflow-x-auto pb-1 text-xs sm:text-sm font-semibold">
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'tracking', label: 'Motion Tracking' },
          { id: 'biomechanics', label: 'Biomechanics' },
          { id: 'timeline', label: 'Event Timeline' },
          { id: 'report', label: 'Academic Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary/15 text-primary border border-primary/30 font-bold sports-glow-lime'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Top Primary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isSprint ? (
              <>
                <KpiCard
                  label="Average Speed"
                  value={sm?.avg_speed_mps}
                  unit="m/s"
                  description="Forward horizontal velocity"
                  formula="v_avg = Total Distance (m) / Elapsed Time (s)"
                  status={sm?.speed_calibrated ? 'success' : 'warning'}
                  statusText={sm?.speed_calibrated ? 'Calibrated' : 'Uncalibrated'}
                  icon={<Zap size={16} />}
                />
                <KpiCard
                  label="Step Cadence"
                  value={sm?.cadence_spm}
                  unit="spm"
                  description="Step frequency (steps/min)"
                  formula="Cadence = (Detected Foot Strikes / Δt) * 60"
                  status={sm?.cadence_spm ? 'success' : 'info'}
                  statusText={sm?.cadence_spm ? 'Detected' : 'Uncomputed'}
                  icon={<Activity size={16} />}
                />
                <KpiCard
                  label="Detected Steps"
                  value={sm?.total_steps}
                  unit="steps"
                  description="Total foot contact events"
                  formula="Ankle vertical peak ground-strike detection"
                  status="info"
                  statusText={`${sm?.valid_frames_count || 0} valid frames`}
                  icon={<Layers size={16} />}
                />
                <KpiCard
                  label="Pose Coverage"
                  value={sm?.pose_coverage_pct}
                  unit="%"
                  description="Landmark retention percentage"
                  formula="(Valid 33-point Frames / Total Frames) * 100"
                  status={sm && sm.pose_coverage_pct > 70 ? 'success' : 'warning'}
                  statusText={sm && sm.pose_coverage_pct > 70 ? 'Optimal' : 'Low Visibility'}
                  icon={<CheckCircle2 size={16} />}
                />
              </>
            ) : (
              <>
                <KpiCard
                  label="Flight Time"
                  value={jm?.flight_time_s}
                  unit="s"
                  description="Duration in ballistic flight phase"
                  formula="t_flight = t_landing - t_takeoff"
                  status={jm?.flight_time_s ? 'success' : 'info'}
                  statusText={jm?.flight_time_s ? 'Detected' : 'Uncomputed'}
                  icon={<Clock size={16} />}
                />
                <KpiCard
                  label="Displacement"
                  value={jm?.displacement_calibrated ? jm.horizontal_displacement_m : jm?.horizontal_displacement_px}
                  unit={jm?.displacement_calibrated ? 'm' : 'px'}
                  description="Hip horizontal translation"
                  formula="|x_landing - x_takeoff| proxy"
                  status={jm?.displacement_calibrated ? 'success' : 'warning'}
                  statusText={jm?.displacement_calibrated ? 'Calibrated' : 'Pixel Only'}
                  icon={<Activity size={16} />}
                />
                <KpiCard
                  label="Take-off Angle"
                  value={jm?.takeoff_angle_deg}
                  unit="deg"
                  description="Initial projection trajectory"
                  formula="arctan(v_y / v_x) at takeoff frame"
                  status="info"
                  statusText="Planar Vector"
                  icon={<Sliders size={16} />}
                />
                <KpiCard
                  label="Pose Coverage"
                  value={jm?.pose_coverage_pct}
                  unit="%"
                  description="Landmark retention percentage"
                  formula="(Valid 33-point Frames / Total Frames) * 100"
                  status={jm && jm.pose_coverage_pct > 70 ? 'success' : 'warning'}
                  statusText={jm && jm.pose_coverage_pct > 70 ? 'Optimal' : 'Low Visibility'}
                  icon={<CheckCircle2 size={16} />}
                />
              </>
            )}
          </div>

          {/* Video Player & Synchronized Overlay */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <VideoPosePlayer
                originalVideoUrl={session.video_relative_url}
                annotatedVideoUrl={session.annotated_video_relative_url}
                landmarks={landmarks}
                fps={meta?.fps || 30.0}
                duration={meta?.duration_s || 0}
                onTimeUpdate={(t) => setVideoCurrentTime(t)}
                externalSeekTime={externalSeekTime}
              />
            </div>

            {/* Quick Findings Card */}
            <div className="lg:col-span-4 bg-card p-5 rounded-2xl border border-surfaceBorder space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-surfaceBorder">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Analytical Observations
                </h3>
                <span className="text-xs text-primary font-bold">
                  {session.observations.length} items
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {session.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      {obs.severity === 'success' ? (
                        <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                      ) : obs.severity === 'warning' ? (
                        <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                      ) : (
                        <Info size={13} className="text-cyanAccent flex-shrink-0" />
                      )}
                      <span>{obs.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {obs.description}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                      Evidence: {obs.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOTION TRACKING */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-card border border-surfaceBorder flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-300 font-medium">
              Frame-by-frame 33-point MediaPipe BlazePose keypoint visualizer.
            </span>
            <span className="text-cyanAccent font-mono">
              Synchronized Canvas Overlay @ {(videoCurrentTime).toFixed(2)}s
            </span>
          </div>

          <VideoPosePlayer
            originalVideoUrl={session.video_relative_url}
            annotatedVideoUrl={session.annotated_video_relative_url}
            landmarks={landmarks}
            fps={meta?.fps || 30.0}
            duration={meta?.duration_s || 0}
            onTimeUpdate={(t) => setVideoCurrentTime(t)}
            externalSeekTime={externalSeekTime}
          />
        </div>
      )}

      {/* TAB 3: BIOMECHANICS */}
      {activeTab === 'biomechanics' && (
        <div className="space-y-6">
          {/* Speed vs Time Curve */}
          <div className="p-6 rounded-2xl bg-card border border-surfaceBorder space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Instantaneous Velocity Profile</h3>
                <p className="text-xs text-slate-400">
                  Time-resolved forward speed smoothed using Savitzky-Golay polynomial filtering.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-primary">
                {sm?.peak_speed_mps ? `Peak: ${sm.peak_speed_mps} m/s` : 'Uncalibrated'}
              </span>
            </div>
            <SpeedTimeChart data={session.time_series} events={session.events} />
          </div>

          {/* Elevation / Trajectory Curve */}
          <div className="p-6 rounded-2xl bg-card border border-surfaceBorder space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isSprint ? 'Lower Limb & Pelvis Vertical Trajectory' : 'Ballistic Aerial Jump Parabola'}
                </h3>
                <p className="text-xs text-slate-400">
                  Hip midpoint proxy elevation and ankle height oscillation over time.
                </p>
              </div>
            </div>
            <TrajectoryChart data={session.time_series} eventType={session.event_type} events={session.events} />
          </div>

          {/* Scientific Formulas & Assumptions Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-surfaceBorder space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Scientific Measurement Assumptions &amp; Formulations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="font-bold text-cyanAccent font-mono">1. Cadence Formulation</span>
                <p className="text-slate-400 leading-relaxed font-mono">
                  Cadence = (N_steps / &Delta;t_elapsed) &times; 60
                </p>
                <p className="text-slate-400 text-[11px]">
                  Derived from peak ground contact detection on smoothed ankle vertical displacement trajectories.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="font-bold text-primary font-mono">2. Velocity &amp; Distance Calibration</span>
                <p className="text-slate-400 leading-relaxed font-mono">
                  Scale = &Delta;px_ref / D_known (px/m) &rarr; v(t) = (&Delta;x_px / Scale) / &Delta;t
                </p>
                <p className="text-slate-400 text-[11px]">
                  Requires planar perpendicular camera view. Front-view recordings introduce foreshortening errors.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EVENT TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder space-y-6">
          <EventTimeline
            events={session.events}
            activeTime={videoCurrentTime}
            onSelectEvent={(t) => setExternalSeekTime(t)}
          />

          <div className="pt-4 border-t border-slate-800">
            <VideoPosePlayer
              originalVideoUrl={session.video_relative_url}
              annotatedVideoUrl={session.annotated_video_relative_url}
              landmarks={landmarks}
              fps={meta?.fps || 30.0}
              duration={meta?.duration_s || 0}
              onTimeUpdate={(t) => setVideoCurrentTime(t)}
              externalSeekTime={externalSeekTime}
            />
          </div>
        </div>
      )}

      {/* TAB 5: ACADEMIC REPORT */}
      {activeTab === 'report' && (
        <div className="p-6 sm:p-10 rounded-3xl bg-card border border-surfaceBorder space-y-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="border-b border-surfaceBorder pb-6 flex items-start justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-primary uppercase tracking-widest mb-1">
                BITS Pilani Introduction to Sports Engineering &bull; Assignment 2, Project 7
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                SprintIQ Biomechanical Performance Assessment Report
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Automated Monocular Computer Vision Analysis &bull; Generated: {new Date(session.created_at).toLocaleString()}
              </p>
            </div>
            <a
              href={ApiService.getExportUrl(session.id, 'pdf')}
              download
              className="px-4 py-2 rounded-xl bg-primary text-slate-950 font-bold text-xs flex items-center gap-1.5 sports-glow-lime"
            >
              <Download size={14} /> Download PDF
            </a>
          </div>

          {/* Session Summary Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 font-mono">Session ID</span>
              <div className="font-bold text-white truncate font-mono mt-0.5">{session.id}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 font-mono">Event Modality</span>
              <div className="font-bold text-white uppercase mt-0.5">{session.event_type}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 font-mono">Camera View</span>
              <div className="font-bold text-white capitalize mt-0.5">{calib.camera_view} View</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-500 font-mono">Spatial Scale</span>
              <div className="font-bold text-white font-mono mt-0.5">
                {calib.is_calibrated ? `${calib.pixels_per_meter} px/m` : 'Uncalibrated'}
              </div>
            </div>
          </div>

          {/* Parameters Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Primary Extracted Parameters
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Parameter Name</th>
                    <th className="p-3">Calculated Value</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {isSprint ? (
                    <>
                      <tr>
                        <td className="p-3 font-medium text-white">Cadence (Frequency)</td>
                        <td className="p-3 text-primary font-bold">{sm?.cadence_spm || 'N/A'}</td>
                        <td className="p-3 text-slate-400">steps/min</td>
                        <td className="p-3 text-emerald-400">Computed</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Total Steps Detected</td>
                        <td className="p-3 text-white">{sm?.total_steps || 0}</td>
                        <td className="p-3 text-slate-400">steps</td>
                        <td className="p-3 text-emerald-400">Valid</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Average Speed</td>
                        <td className="p-3 text-white">{sm?.avg_speed_mps || 'Uncalibrated'}</td>
                        <td className="p-3 text-slate-400">m/s</td>
                        <td className="p-3 text-slate-400">{sm?.speed_calibrated ? 'Calibrated' : 'Missing Scale'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Step Symmetry Ratio</td>
                        <td className="p-3 text-white">{sm?.step_symmetry_ratio || 'N/A'}</td>
                        <td className="p-3 text-slate-400">ratio (L/R)</td>
                        <td className="p-3 text-cyanAccent">Computed</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="p-3 font-medium text-white">Estimated Flight Time</td>
                        <td className="p-3 text-cyanAccent font-bold">{jm?.flight_time_s || 'N/A'}</td>
                        <td className="p-3 text-slate-400">seconds</td>
                        <td className="p-3 text-emerald-400">Computed</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Horizontal Displacement</td>
                        <td className="p-3 text-white">
                          {jm?.displacement_calibrated ? `${jm.horizontal_displacement_m} m` : `${jm?.horizontal_displacement_px} px`}
                        </td>
                        <td className="p-3 text-slate-400">{jm?.displacement_calibrated ? 'm' : 'px'}</td>
                        <td className="p-3 text-slate-400">{jm?.displacement_calibrated ? 'Calibrated' : 'Pixel Only'}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Estimated Take-off Angle</td>
                        <td className="p-3 text-white">{jm?.takeoff_angle_deg ? `${jm.takeoff_angle_deg}°` : 'N/A'}</td>
                        <td className="p-3 text-slate-400">degrees</td>
                        <td className="p-3 text-cyanAccent">Estimated</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observations List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Rule-Based Biomechanical Findings
            </h3>
            <div className="space-y-2">
              {session.observations.map((obs, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="font-bold text-white mb-1">
                    [{obs.severity.toUpperCase()}] {obs.title}
                  </div>
                  <p className="text-slate-400">{obs.description}</p>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">Evidence: {obs.evidence}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Limitations Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
            <span className="font-bold text-slate-300">Methodology &amp; Measurement Limitations:</span>
            <p className="leading-relaxed">
              This report was generated using SprintIQ, an academic prototype developed for BITS Pilani Sports Engineering.
              OpenCV is employed for frame decoding and MediaPipe Pose Landmarker for 33-point human pose estimation.
              Calculations assume planar motion. Monocular perspective parallax, camera motion, and motion blur constitute
              inherent physical measurement uncertainties.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
