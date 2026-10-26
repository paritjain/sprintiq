import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { AnalysisSession, EventType } from '../types';
import {
  Zap,
  ArrowRight,
  UploadCloud,
  Activity,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Play,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  RefreshCw,
} from 'lucide-react';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);
  const [eventFilter, setEventFilter] = useState<'all' | 'sprint' | 'jump'>('all');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getAnalyses();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleLoadDemo = async (type: 'sprint' | 'jump') => {
    try {
      setLoadingDemo(true);
      const newSession = await ApiService.loadDemo(type);
      navigate(`/results/${newSession.id}`);
    } catch (err) {
      alert(`Could not trigger demo: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoadingDemo(false);
    }
  };

  // Derive genuine summary figures from stored sessions (Never fabricated)
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalAnalyses = completedSessions.length;
  
  // Calculate average sprint speed across valid calibrated sprint analyses
  const validSprintSpeeds = completedSessions
    .filter((s) => s.event_type === 'sprint' && s.sprint_metrics?.avg_speed_mps)
    .map((s) => s.sprint_metrics!.avg_speed_mps!);
  const avgSprintSpeed = validSprintSpeeds.length > 0
    ? (validSprintSpeeds.reduce((a, b) => a + b, 0) / validSprintSpeeds.length).toFixed(2)
    : null;

  // Calculate best recorded jump distance across valid calibrated jump analyses
  const validJumpDistances = completedSessions
    .filter((s) => s.event_type === 'jump' && s.jump_metrics?.horizontal_displacement_m)
    .map((s) => s.jump_metrics!.horizontal_displacement_m!);
  const bestJumpDistance = validJumpDistances.length > 0
    ? Math.max(...validJumpDistances).toFixed(2)
    : null;

  const filteredSessions = sessions.filter((s) => {
    if (eventFilter === 'all') return true;
    return s.event_type === eventFilter;
  });

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-card via-panel to-slate-900 border border-surfaceBorder overflow-hidden p-6 sm:p-10 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-cyanAccent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold">
              <Zap size={13} className="fill-primary" />
              <span>BITS Pilani Sports Engineering Lab &bull; Project 7</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Turn Athletic Movement into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyanAccent">
                Measurable Performance.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
              Analyse sprinting and jumping videos using computer vision, MediaPipe pose estimation, and biomechanical performance metrics.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/analyze"
                className="px-6 py-3.5 rounded-xl bg-primary text-slate-950 font-bold hover:bg-primary-hover transition-all flex items-center gap-2.5 sports-glow-lime text-sm sm:text-base"
              >
                <span>Start New Analysis</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/methodology"
                className="px-5 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-all text-sm sm:text-base flex items-center gap-2"
              >
                <FileText size={17} className="text-cyanAccent" />
                <span>Explore Methodology</span>
              </Link>
            </div>
          </div>

          {/* Athletic Skeletal Pose Illustration / Visual Asset */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md aspect-video sm:aspect-square rounded-2xl bg-slate-950/90 border border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-slate-800/80">
                <span className="flex items-center gap-1.5 text-primary">
                  <Cpu size={14} /> BlazePose 33-Keypoint Topology
                </span>
                <span>Active Tracking</span>
              </div>

              {/* Dynamic SVG Biomechanical Skeleton Graphic */}
              <div className="relative flex-1 flex items-center justify-center py-4">
                <svg viewBox="0 0 400 300" className="w-full h-full max-h-56 filter drop-shadow">
                  {/* Grid Lines */}
                  <line x1="20" y1="240" x2="380" y2="240" stroke="#334155" strokeWidth="2" strokeDasharray="6 4" />
                  
                  {/* Runner Skeleton in High Velocity Sprint Posture */}
                  {/* Torso */}
                  <line x1="210" y1="90" x2="190" y2="160" stroke="#10E76E" strokeWidth="4" strokeLinecap="round" />
                  {/* Head */}
                  <circle cx="218" cy="65" r="16" fill="#0B1120" stroke="#10E76E" strokeWidth="3" />
                  {/* Arms */}
                  <line x1="210" y1="95" x2="250" y2="120" stroke="#10E76E" strokeWidth="3" />
                  <line x1="250" y1="120" x2="275" y2="90" stroke="#10E76E" strokeWidth="3" />
                  <line x1="210" y1="95" x2="170" y2="115" stroke="#10E76E" strokeWidth="3" />
                  <line x1="170" y1="115" x2="150" y2="150" stroke="#10E76E" strokeWidth="3" />

                  {/* Left Leg (Drive Leg Forward) */}
                  <line x1="190" y1="160" x2="235" y2="175" stroke="#06B6D4" strokeWidth="4" />
                  <line x1="235" y1="175" x2="245" y2="235" stroke="#06B6D4" strokeWidth="4" />
                  <line x1="245" y1="235" x2="265" y2="238" stroke="#06B6D4" strokeWidth="4" />

                  {/* Right Leg (Trailing Stance Leg) */}
                  <line x1="190" y1="160" x2="145" y2="185" stroke="#06B6D4" strokeWidth="4" />
                  <line x1="145" y1="185" x2="125" y2="238" stroke="#06B6D4" strokeWidth="4" />
                  <line x1="125" y1="238" x2="110" y2="240" stroke="#06B6D4" strokeWidth="4" />

                  {/* Key Joint Rings */}
                  <circle cx="210" cy="95" r="5" fill="#FFFFFF" stroke="#10E76E" strokeWidth="2" />
                  <circle cx="190" cy="160" r="6" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="235" cy="175" r="5" fill="#38BDF8" />
                  <circle cx="245" cy="235" r="5" fill="#10E76E" />
                  <circle cx="145" cy="185" r="5" fill="#38BDF8" />
                  <circle cx="125" cy="238" r="5" fill="#10E76E" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                <span>FPS: 30.0 &bull; Planar 2D Kinematics</span>
                <span className="text-primary font-bold">100% Computer Vision</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards (Derived from real stored analyses) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-surfaceBorder shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-semibold mb-2">
            <span>Total Analyses</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {totalAnalyses}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Completed video sessions in storage
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-surfaceBorder shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-semibold mb-2">
            <span>Sessions Archived</span>
            <Layers className="w-4 h-4 text-cyanAccent" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {sessions.length}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Across sprint and jump modalities
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-surfaceBorder shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-semibold mb-2">
            <span>Avg Sprint Speed</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5 text-3xl font-extrabold text-white font-mono">
            {avgSprintSpeed ? avgSprintSpeed : <span className="text-slate-500 text-base italic">Uncalibrated</span>}
            {avgSprintSpeed && <span className="text-sm font-sans font-semibold text-slate-400">m/s</span>}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {validSprintSpeeds.length > 0 ? `Across ${validSprintSpeeds.length} calibrated runs` : 'Requires 2D spatial calibration'}
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-surfaceBorder shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-semibold mb-2">
            <span>Best Jump Distance</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex items-baseline gap-1.5 text-3xl font-extrabold text-white font-mono">
            {bestJumpDistance ? bestJumpDistance : <span className="text-slate-500 text-base italic">No records</span>}
            {bestJumpDistance && <span className="text-sm font-sans font-semibold text-slate-400">m</span>}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {validJumpDistances.length > 0 ? `Peak displacement measured` : 'Requires calibrated jump trial'}
          </div>
        </div>
      </div>

      {/* How It Works (4-Step Workflow) */}
      <div className="rounded-3xl bg-card border border-surfaceBorder p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surfaceBorder pb-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Biomechanical Processing Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              From raw monocular video recording to scientifically grounded performance indicators.
            </p>
          </div>
          <span className="text-xs font-mono text-cyanAccent uppercase tracking-wider font-semibold">
            Automated Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Video Ingestion & Validation',
              desc: 'Decodes MP4/MOV frames via OpenCV, extracts resolution, frame rate, and verifies planar camera geometry.',
              icon: UploadCloud,
            },
            {
              step: '02',
              title: 'MediaPipe Pose Estimation',
              desc: 'Extracts 33 body landmarks per sampled frame with confidence scores for pelvis, knees, ankles, and feet.',
              icon: Cpu,
            },
            {
              step: '03',
              title: 'Kinematic & Event Calculation',
              desc: 'Applies Savitzky-Golay smoothing and SciPy peak detection to measure step cadence, step timing, or flight time.',
              icon: Activity,
            },
            {
              step: '04',
              title: 'Review & Scientific Export',
              desc: 'Inspect synchronized video skeleton overlay, evaluate rule-based findings, and export PDF / CSV reports.',
              icon: FileText,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    Step {item.step}
                  </span>
                  <item.icon className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Analyses & Demo Launchers */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Recent Analyses</h2>
            <p className="text-xs text-slate-400">
              Stored athletic sessions and processed biomechanical trials.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs font-medium">
              {(['all', 'sprint', 'jump'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setEventFilter(filter)}
                  className={`px-3 py-1 rounded-lg transition-all capitalize ${
                    eventFilter === filter
                      ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={fetchSessions}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh session list"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Sessions Grid / Table */}
        {loading ? (
          <div className="p-12 rounded-2xl bg-card border border-surfaceBorder text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            Loading recorded sessions...
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session) => (
              <Link
                key={session.id}
                to={`/results/${session.id}`}
                className="group p-5 rounded-2xl bg-card border border-surfaceBorder hover:border-slate-700 transition-all flex flex-col justify-between shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-cyanAccent border border-slate-700">
                      {session.event_type}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        session.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : session.status === 'processing'
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                    {session.name}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    {session.created_at ? new Date(session.created_at).toLocaleString() : 'Recent'}
                  </div>

                  {/* Primary metric snippet */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {session.event_type === 'sprint' ? (
                      <>
                        <span className="text-slate-400">Cadence:</span>
                        <span className="font-mono font-bold text-white">
                          {session.sprint_metrics?.cadence_spm ? `${session.sprint_metrics.cadence_spm} spm` : 'Uncomputed'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400">Flight Time:</span>
                        <span className="font-mono font-bold text-white">
                          {session.jump_metrics?.flight_time_s ? `${session.jump_metrics.flight_time_s} s` : 'Uncomputed'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-primary font-semibold">
                  <span>View Biomechanics</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty Onboarding State */
          <div className="p-10 rounded-3xl bg-card border border-surfaceBorder text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <UploadCloud size={28} />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-bold text-white">No Analysis Sessions Found</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Upload your first sprint or long jump video to extract body landmarks, compute step cadence, and generate an academic performance report.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/analyze"
                className="px-6 py-3 rounded-xl bg-primary text-slate-950 font-bold hover:bg-primary-hover transition-all text-sm sports-glow-lime"
              >
                Upload Video to Analyze
              </Link>
              <button
                disabled={loadingDemo}
                onClick={() => handleLoadDemo('sprint')}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all text-sm flex items-center gap-2 border border-slate-700"
              >
                <Play size={14} className="text-cyanAccent" />
                <span>{loadingDemo ? 'Processing Trial...' : 'Run Sample Sprint Demo'}</span>
              </button>
              <button
                disabled={loadingDemo}
                onClick={() => handleLoadDemo('jump')}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all text-sm flex items-center gap-2 border border-slate-700"
              >
                <Play size={14} className="text-yellow-400" />
                <span>Run Sample Jump Demo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
