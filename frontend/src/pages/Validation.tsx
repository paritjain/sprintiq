import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { AnalysisSession } from '../types';
import {
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  AlertTriangle,
  Play,
  RotateCcw,
  Plus,
  Sliders,
  HelpCircle,
} from 'lucide-react';

interface ManualAnnotation {
  id: string;
  label: string;
  groundTruthTime: number;
}

export const Validation: React.FC = () => {
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [manualAnnotations, setManualAnnotations] = useState<ManualAnnotation[]>([
    { id: 'gt-1', label: 'Left Foot Strike', groundTruthTime: 0.65 },
    { id: 'gt-2', label: 'Right Foot Strike', groundTruthTime: 0.96 },
    { id: 'gt-3', label: 'Left Foot Strike', groundTruthTime: 1.28 },
    { id: 'gt-4', label: 'Right Foot Strike', groundTruthTime: 1.59 },
  ]);

  const [newLabel, setNewLabel] = useState<string>('Foot Strike');
  const [newTime, setNewTime] = useState<string>('0.50');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ApiService.getAnalyses();
        const completed = data.filter((s) => s.status === 'completed');
        setSessions(completed);
        if (completed.length > 0) {
          setSelectedSessionId(completed[0].id);
        }
      } catch (err) {
        console.error('Failed to load validation sessions', err);
      }
    };
    load();
  }, []);

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const handleAddAnnotation = () => {
    const timeVal = parseFloat(newTime);
    if (isNaN(timeVal) || timeVal < 0) return;
    setManualAnnotations([
      ...manualAnnotations,
      {
        id: `gt-${Date.now()}`,
        label: newLabel,
        groundTruthTime: timeVal,
      },
    ]);
  };

  // Compare automated event timestamps against manually reviewed ground truth
  const validationComparisons = manualAnnotations.map((gt) => {
    if (!currentSession || !currentSession.events || currentSession.events.length === 0) {
      return {
        ...gt,
        predictedTime: null,
        errorDelta: null,
      };
    }

    // Find closest event timestamp in predicted events
    let closestTime = currentSession.events[0].timestamp_s;
    let minDiff = Math.abs(closestTime - gt.groundTruthTime);

    for (const ev of currentSession.events) {
      const diff = Math.abs(ev.timestamp_s - gt.groundTruthTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestTime = ev.timestamp_s;
      }
    }

    const delta = Number((closestTime - gt.groundTruthTime).toFixed(3));
    return {
      ...gt,
      predictedTime: closestTime,
      errorDelta: delta,
    };
  });

  const validDeltas = validationComparisons
    .filter((v) => v.errorDelta !== null)
    .map((v) => Math.abs(v.errorDelta!));

  const meanAbsoluteError = validDeltas.length > 0
    ? (validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length).toFixed(3)
    : null;

  const totalFrames = currentSession?.video_metadata?.total_frames || 0;
  const validFrames = currentSession?.sprint_metrics?.valid_frames_count || currentSession?.jump_metrics?.valid_frames_count || 0;
  const coveragePct = currentSession?.sprint_metrics?.pose_coverage_pct || currentSession?.jump_metrics?.pose_coverage_pct || 0;
  const rejectedFrames = Math.max(0, totalFrames - validFrames);
  const rejectionRate = totalFrames > 0 ? ((rejectedFrames / totalFrames) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <CheckCircle2 className="text-primary" />
          <span>Model Validation &amp; Ground Truth Evaluation</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Validate automated computer vision event markers against manual human review. Separates processing reliability from empirical accuracy.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-surfaceBorder text-center space-y-3">
          <h3 className="text-lg font-bold text-white">No Completed Analyses to Validate</h3>
          <p className="text-xs text-slate-400">
            Run an analysis session or load a sample video first.
          </p>
        </div>
      ) : (
        <>
          {/* Active Session Picker */}
          <div className="p-4 rounded-2xl bg-card border border-surfaceBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Activity size={16} className="text-primary" />
              <span>Select Session for Validation:</span>
            </div>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs max-w-xs"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.event_type.toUpperCase()}] {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-surfaceBorder shadow-md">
              <div className="text-xs text-slate-400 uppercase font-semibold mb-2">
                Processed Frames
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">
                {validFrames} / {totalFrames}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Valid 33-point landmarks
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-surfaceBorder shadow-md">
              <div className="text-xs text-slate-400 uppercase font-semibold mb-2">
                Tracking Coverage
              </div>
              <div className="text-2xl font-extrabold text-primary font-mono">
                {coveragePct}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Overall landmark retention
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-surfaceBorder shadow-md">
              <div className="text-xs text-slate-400 uppercase font-semibold mb-2">
                Rejection Rate
              </div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono">
                {rejectionRate}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Frames rejected (low conf.)
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-surfaceBorder shadow-md">
              <div className="text-xs text-slate-400 uppercase font-semibold mb-2">
                Mean Abs Error (MAE)
              </div>
              <div className="text-2xl font-extrabold text-cyanAccent font-mono">
                {meanAbsoluteError ? `${meanAbsoluteError} s` : 'N/A'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                vs manual ground-truth timestamps
              </div>
            </div>
          </div>

          {/* Ground Truth Annotation Review Workflow */}
          <div className="p-6 rounded-3xl bg-card border border-surfaceBorder space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surfaceBorder pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Manual Ground-Truth Review Workflow
                </h3>
                <p className="text-xs text-slate-400">
                  Annotate reference event timestamps to quantitatively assess model prediction residuals (&Delta;t).
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyanAccent font-semibold">
                Scientific Verification
              </span>
            </div>

            {/* Input Row */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Milestone Event:</span>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs w-36"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Timestamp (s):</span>
                <input
                  type="number"
                  step="0.01"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs w-24"
                />
              </div>

              <button
                onClick={handleAddAnnotation}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-slate-950 font-bold hover:bg-primary-hover transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Ground Truth
              </button>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Reference Event</th>
                    <th className="p-3">Ground-Truth Timestamp</th>
                    <th className="p-3">Predicted Timestamp</th>
                    <th className="p-3">Error Residual (&Delta;t)</th>
                    <th className="p-3">Agreement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {validationComparisons.map((item) => {
                    const absErr = item.errorDelta !== null ? Math.abs(item.errorDelta) : 999;
                    const isAgreed = absErr <= 0.07; // within ~2 video frames at 30 FPS
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/30">
                        <td className="p-3 font-medium text-white">{item.label}</td>
                        <td className="p-3 text-slate-300">{item.groundTruthTime.toFixed(3)}s</td>
                        <td className="p-3 text-primary font-bold">
                          {item.predictedTime !== null ? `${item.predictedTime.toFixed(3)}s` : 'Unmatched'}
                        </td>
                        <td className="p-3 text-slate-300">
                          {item.errorDelta !== null ? `${item.errorDelta > 0 ? '+' : ''}${item.errorDelta.toFixed(3)}s` : 'N/A'}
                        </td>
                        <td className="p-3">
                          {isAgreed ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} /> High (&le;2 frames)
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <AlertTriangle size={13} /> Moderate Discrepancy
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-bold text-slate-300">Validation Protocol Note:</span>
              <p className="leading-relaxed">
                At standard 30 FPS, one frame corresponds to 33.3 milliseconds. Temporal discrepancies under &plusmn;67ms
                (2 frames) fall within acceptable limits for non-contact monocular optical estimation.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
