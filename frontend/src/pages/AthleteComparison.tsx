import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { AnalysisSession } from '../types';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const AthleteComparison: React.FC = () => {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ApiService.getAnalyses();
        const completed = data.filter((s) => s.status === 'completed');
        setSessions(completed);
        if (completed.length >= 2) {
          setSelectedIds([completed[0].id, completed[1].id]);
        } else if (completed.length === 1) {
          setSelectedIds([completed[0].id]);
        }
      } catch (err) {
        console.error('Failed to load comparison sessions', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      } else {
        setSelectedIds([selectedIds[0], id]);
      }
    }
  };

  const selectedSessions = sessions.filter((s) => selectedIds.includes(s.id));

  // Check compatibility & discrepancies
  const eventTypes = new Set(selectedSessions.map((s) => s.event_type));
  const hasEventMismatch = eventTypes.size > 1;

  const cameraViews = new Set(selectedSessions.map((s) => s.calibration.camera_view));
  const hasViewMismatch = cameraViews.size > 1;

  const hasCalibrationMismatch = selectedSessions.some(
    (s) => s.calibration.is_calibrated !== selectedSessions[0]?.calibration.is_calibrated
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <GitCompare className="text-primary" />
          <span>Athlete &amp; Trial Comparison</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Perform differential kinematic assessment across trials with compatible calibration and camera orientations.
        </p>
      </div>

      {sessions.length < 2 ? (
        <div className="p-12 rounded-3xl bg-card border border-surfaceBorder text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <GitCompare size={28} />
          </div>
          <h3 className="text-lg font-bold text-white">Insufficient Completed Sessions</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Differential comparison requires at least 2 completed analyses. Run another video analysis or load a sample dataset to compare trials.
          </p>
        </div>
      ) : (
        <>
          {/* Selector Bar */}
          <div className="p-4 rounded-2xl bg-card border border-surfaceBorder space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase font-mono">
              Select Trials to Compare (Select 2):
            </span>
            <div className="flex flex-wrap gap-2">
              {sessions.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSelect(s.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-primary/15 border-primary text-primary sports-glow-lime'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="capitalize font-mono text-[10px] text-cyanAccent">
                      [{s.event_type}]
                    </span>
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compatibility Warnings */}
          {(hasEventMismatch || hasViewMismatch || hasCalibrationMismatch) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={15} />
                <span>Measurement Compatibility Notice</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                {hasEventMismatch && (
                  <li>Selected trials compare different athletic events (Sprint vs Jump). Absolute velocity and cadence are not cross-comparable.</li>
                )}
                {hasViewMismatch && (
                  <li>Selected trials use differing camera orientations (e.g. side vs front). Perspective foreshortening skews displacement metrics.</li>
                )}
                {hasCalibrationMismatch && (
                  <li>One or more trials lack spatial scale calibration. Absolute metric differences (m/s, metres) cannot be validly compared.</li>
                )}
              </ul>
            </div>
          )}

          {/* Side by Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedSessions.map((sess, idx) => {
              const isSp = sess.event_type === 'sprint';
              return (
                <div
                  key={sess.id}
                  className="p-6 rounded-3xl bg-card border border-surfaceBorder space-y-5 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
                    <div>
                      <span className="text-[10px] font-mono text-cyanAccent uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                        Trial {idx + 1}: {sess.event_type}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5 line-clamp-1">
                        {sess.name}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(sess.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Duration &amp; FPS</span>
                      <span className="text-white font-bold">{sess.video_metadata?.duration_s}s @ {sess.video_metadata?.fps} FPS</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Spatial Scale</span>
                      <span className="text-white font-bold">
                        {sess.calibration.is_calibrated ? `${sess.calibration.pixels_per_meter} px/m` : 'Uncalibrated'}
                      </span>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="space-y-2 text-xs font-mono">
                    {isSp ? (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Average Velocity</span>
                          <span className="text-white font-bold text-sm">
                            {sess.sprint_metrics?.avg_speed_mps ? `${sess.sprint_metrics.avg_speed_mps} m/s` : 'Uncalibrated'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Step Cadence</span>
                          <span className="text-primary font-bold text-sm">
                            {sess.sprint_metrics?.cadence_spm ? `${sess.sprint_metrics.cadence_spm} spm` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Total Steps</span>
                          <span className="text-white font-bold">
                            {sess.sprint_metrics?.total_steps || 0} steps
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Pose Coverage</span>
                          <span className="text-cyanAccent font-bold">
                            {sess.sprint_metrics?.pose_coverage_pct}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Flight Time</span>
                          <span className="text-cyanAccent font-bold text-sm">
                            {sess.jump_metrics?.flight_time_s ? `${sess.jump_metrics.flight_time_s} s` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Displacement</span>
                          <span className="text-white font-bold text-sm">
                            {sess.jump_metrics?.displacement_calibrated ? `${sess.jump_metrics.horizontal_displacement_m} m` : `${sess.jump_metrics?.horizontal_displacement_px} px`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Take-off Angle</span>
                          <span className="text-white font-bold">
                            {sess.jump_metrics?.takeoff_angle_deg ? `${sess.jump_metrics.takeoff_angle_deg}°` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <span className="text-slate-400">Pose Coverage</span>
                          <span className="text-cyanAccent font-bold">
                            {sess.jump_metrics?.pose_coverage_pct}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Differential Calculation Section (Never fabricated) */}
          {selectedSessions.length === 2 && !hasEventMismatch && (
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-surfaceBorder space-y-4">
              <h3 className="text-base font-bold text-white tracking-tight">
                Differential Measurement &Delta; (Trial 2 &minus; Trial 1)
              </h3>

              {selectedSessions[0].event_type === 'sprint' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  {/* Cadence delta */}
                  {selectedSessions[0].sprint_metrics?.cadence_spm && selectedSessions[1].sprint_metrics?.cadence_spm && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">&Delta; Cadence</span>
                      <div className="text-xl font-bold text-white mt-1">
                        {(selectedSessions[1].sprint_metrics!.cadence_spm! - selectedSessions[0].sprint_metrics!.cadence_spm!).toFixed(1)} spm
                      </div>
                      <span className="text-[10px] text-slate-500">Formula: Cadence_2 - Cadence_1</span>
                    </div>
                  )}

                  {/* Speed delta */}
                  {selectedSessions[0].sprint_metrics?.avg_speed_mps && selectedSessions[1].sprint_metrics?.avg_speed_mps && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">&Delta; Avg Speed</span>
                      <div className="text-xl font-bold text-primary mt-1">
                        {(selectedSessions[1].sprint_metrics!.avg_speed_mps! - selectedSessions[0].sprint_metrics!.avg_speed_mps!).toFixed(2)} m/s
                      </div>
                      <span className="text-[10px] text-slate-500">Formula: v_avg_2 - v_avg_1</span>
                    </div>
                  )}

                  {/* Coverage delta */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">&Delta; Tracking Coverage</span>
                    <div className="text-xl font-bold text-cyanAccent mt-1">
                      {(selectedSessions[1].sprint_metrics!.pose_coverage_pct - selectedSessions[0].sprint_metrics!.pose_coverage_pct).toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-slate-500">Landmark retention delta</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {selectedSessions[0].jump_metrics?.flight_time_s && selectedSessions[1].jump_metrics?.flight_time_s && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block text-[11px]">&Delta; Flight Time</span>
                      <div className="text-xl font-bold text-cyanAccent mt-1">
                        {(selectedSessions[1].jump_metrics!.flight_time_s! - selectedSessions[0].jump_metrics!.flight_time_s!).toFixed(3)} s
                      </div>
                      <span className="text-[10px] text-slate-500">Formula: t_flight_2 - t_flight_1</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
