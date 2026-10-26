import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { EventType, CameraView } from '../types';
import {
  UploadCloud,
  Zap,
  Activity,
  ArrowRight,
  CheckCircle2,
  FileVideo,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  Crosshair,
  Gauge,
  Sparkles,
} from 'lucide-react';

export const NewAnalysis: React.FC = () => {
  const navigate = useNavigate();

  // Step state: 1: Event, 2: Upload, 3: Configure, 4: Processing
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [eventType, setEventType] = useState<EventType>('sprint');
  const [sessionName, setSessionName] = useState<string>('');

  // Video file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calibration configuration
  const [cameraView, setCameraView] = useState<CameraView>('side');
  const [knownDistance, setKnownDistance] = useState<string>('1.0');
  const [sampleInterval, setSampleInterval] = useState<number>(1);
  const [processingMode, setProcessingMode] = useState<'detailed' | 'fast'>('detailed');

  // Interactive 2-point calibration points
  const [point1, setPoint1] = useState<{ x: number; y: number } | null>({ x: 80, y: 420 });
  const [point2, setPoint2] = useState<{ x: number; y: number } | null>({ x: 170, y: 420 });
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Submission & Processing state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<string>('Validating video and extracting frames...');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) {
      setErrorMessage(`Format '.${ext}' is not supported. Please select an MP4, MOV, or AVI video.`);
      return;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > 100) {
      setErrorMessage(`File size (${sizeMb.toFixed(1)} MB) exceeds 100 MB limit.`);
      return;
    }

    setSelectedFile(file);
    if (!sessionName) {
      setSessionName(file.name.replace(/\.[^/.]+$/, ''));
    }
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  };

  const handleUseBundledDemo = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setProcessingStage('Ingesting bundled synthetic kinematic video...');
      setProgressPct(15);
      const session = await ApiService.loadDemo(eventType);
      setProgressPct(60);
      setProcessingStage('MediaPipe Pose inference in progress...');
      navigate(`/results/${session.id}`);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to launch demo');
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      setErrorMessage('Please upload a video file or use the bundled demonstration.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setCurrentStep(4);
      setProgressPct(10);
      setProcessingStage('Uploading video to backend engine...');

      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('name', sessionName || `${eventType.toUpperCase()} Trial`);
      formData.append('event_type', eventType);
      formData.append('camera_view', cameraView);
      formData.append('sample_interval', sampleInterval.toString());
      formData.append('processing_mode', processingMode);

      if (knownDistance && parseFloat(knownDistance) > 0) {
        formData.append('known_distance_m', knownDistance);
        if (point1 && point2) {
          formData.append('calibration_point_1_x', point1.x.toString());
          formData.append('calibration_point_1_y', point1.y.toString());
          formData.append('calibration_point_2_x', point2.x.toString());
          formData.append('calibration_point_2_y', point2.y.toString());
        }
      }

      const session = await ApiService.uploadAnalysis(formData);
      setProgressPct(35);
      setProcessingStage('Extracting frames and running MediaPipe Pose Landmarker...');

      // Poll until completed
      const pollInterval = setInterval(async () => {
        try {
          const updated = await ApiService.getAnalysis(session.id);
          setProgressPct(updated.progress_pct || 40);
          setProcessingStage(updated.status_message || 'Analyzing biomechanics...');

          if (updated.status === 'completed') {
            clearInterval(pollInterval);
            navigate(`/results/${session.id}`);
          } else if (updated.status === 'failed') {
            clearInterval(pollInterval);
            setIsSubmitting(false);
            setErrorMessage(updated.error_message || 'Analysis pipeline failed on the backend.');
            setCurrentStep(3);
          }
        } catch {
          // keep polling
        }
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err instanceof Error ? err.message : 'Analysis submission failed.');
      setCurrentStep(3);
    }
  };

  // Preview canvas click handler for 2-point calibration
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!calibrating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (!point1 || (point1 && point2)) {
      setPoint1({ x, y });
      setPoint2(null);
    } else {
      setPoint2({ x, y });
      setCalibrating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Step Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          New Biomechanical Analysis
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure video recording, select athletic event modality, and define spatial scale calibration.
        </p>

        {/* Multi-step progress bar */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          {[
            { num: 1, title: 'Choose Event' },
            { num: 2, title: 'Upload Video' },
            { num: 3, title: 'Calibration' },
            { num: 4, title: 'Process' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-3 rounded-xl border text-center transition-all ${
                currentStep === s.num
                  ? 'bg-primary/15 border-primary text-primary font-bold sports-glow-lime'
                  : currentStep > s.num
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-card border-surfaceBorder text-slate-500'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider">Step {s.num}</div>
              <div className="text-xs font-semibold mt-0.5">{s.title}</div>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* STEP 1: CHOOSE EVENT */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sprint Card */}
            <div
              onClick={() => setEventType('sprint')}
              className={`cursor-pointer p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                eventType === 'sprint'
                  ? 'bg-card border-primary ring-2 ring-primary/30 sports-glow-lime'
                  : 'bg-card border-surfaceBorder hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Zap size={24} className="fill-primary" />
                  </div>
                  {eventType === 'sprint' && (
                    <span className="text-xs font-mono font-bold text-primary flex items-center gap-1">
                      <CheckCircle2 size={16} /> Selected
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Sprint Analysis</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Extracts running gait kinematics, step-event contact detection, step cadence, stride time variability, and calibrated velocity profiles.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Contralateral foot strike detection (SciPy peaks)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Cadence formula: (Steps / &Delta;t) &times; 60</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Instantaneous &amp; average speed in m/s</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-mono text-slate-500">
                Recommended: Side-view capture of 30+ FPS
              </div>
            </div>

            {/* Jump Card */}
            <div
              onClick={() => setEventType('jump')}
              className={`cursor-pointer p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                eventType === 'jump'
                  ? 'bg-card border-cyanAccent ring-2 ring-cyanAccent/30 sports-glow-cyan'
                  : 'bg-card border-surfaceBorder hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyanAccent/10 border border-cyanAccent/20 flex items-center justify-center text-cyanAccent">
                    <Activity size={24} />
                  </div>
                  {eventType === 'jump' && (
                    <span className="text-xs font-mono font-bold text-cyanAccent flex items-center gap-1">
                      <CheckCircle2 size={16} /> Selected
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Long Jump Analysis</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Estimates ballistic aerial trajectory, candidate take-off and landing events, flight time, horizontal displacement proxy, and projection angle.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyanAccent" />
                    <span>Take-off and sandpit landing event detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyanAccent" />
                    <span>Flight time calculation (t_landing - t_takeoff)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyanAccent" />
                    <span>Hip midpoint proxy horizontal displacement</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-mono text-slate-500">
                Recommended: Perpendicular view of take-off board &amp; sandpit
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-xl bg-primary text-slate-950 font-bold hover:bg-primary-hover transition-all flex items-center gap-2 text-sm sports-glow-lime"
            >
              <span>Next: Upload Video</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD VIDEO */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center ${
              dragActive
                ? 'border-primary bg-primary/10'
                : selectedFile
                ? 'border-emerald-500/50 bg-slate-900/40'
                : 'border-slate-700 bg-card hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-primary mb-4">
              <UploadCloud size={30} />
            </div>

            {selectedFile ? (
              <div className="space-y-2">
                <div className="text-base font-bold text-white flex items-center gap-2 justify-center">
                  <CheckCircle2 size={18} className="text-primary" />
                  <span>{selectedFile.name}</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for analysis
                </div>
                <div className="pt-3 flex gap-2 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Replace Video
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setVideoPreviewUrl(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/30 text-rose-400 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Drag and drop your athletic recording here
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Supports MP4, MOV, and AVI formats up to 100 MB. Ensure side-view angle for accurate horizontal tracking.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
                  >
                    Browse Files
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Demo Video Mode option */}
          <div className="p-4 rounded-2xl bg-panel border border-surfaceBorder flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyanAccent/10 text-cyanAccent flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Don&apos;t have a video handy?</h4>
                <p className="text-[11px] text-slate-400">
                  Use our bundled OpenCV demonstration video ({eventType.toUpperCase()}) for an immediate live test.
                </p>
              </div>
            </div>
            <button
              onClick={handleUseBundledDemo}
              className="px-4 py-2 rounded-xl bg-cyanAccent/15 border border-cyanAccent/40 text-cyanAccent hover:bg-cyanAccent/25 text-xs font-bold transition-all whitespace-nowrap"
            >
              Load Demo Video
            </button>
          </div>

          {/* Video Preview Player if selected */}
          {videoPreviewUrl && (
            <div className="p-4 rounded-2xl bg-card border border-surfaceBorder space-y-2">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Video Preview
              </span>
              <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Back
            </button>
            <button
              disabled={!selectedFile}
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 rounded-xl bg-primary disabled:opacity-40 text-slate-950 font-bold hover:bg-primary-hover transition-all flex items-center gap-2 text-sm sports-glow-lime"
            >
              <span>Next: Calibration</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIGURE & SPATIAL CALIBRATION */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-surfaceBorder space-y-6">
            <div className="border-b border-surfaceBorder pb-4">
              <h3 className="text-lg font-bold text-white">Measurement Calibration &amp; Parameters</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pixel displacement cannot represent real-world velocity without spatial scale reference.
              </p>
            </div>

            {/* Trial Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Analysis Session Label</label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. Athlete 100m Dash Trial A"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Camera View Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'side', title: 'Side View (Sagittal)', desc: 'Optimal for forward speed & steps' },
                { id: 'front', title: 'Front View (Coronal)', desc: 'Warning: severe foreshortening' },
                { id: 'unknown', title: 'Unknown Angle', desc: 'Approximates perpendicular motion' },
              ].map((v) => (
                <div
                  key={v.id}
                  onClick={() => setCameraView(v.id as CameraView)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    cameraView === v.id
                      ? 'bg-primary/10 border-primary text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-1">{v.title}</div>
                  <div className="text-[11px] text-slate-400">{v.desc}</div>
                </div>
              ))}
            </div>

            {/* Known Reference Distance */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Known Reference Distance in Frame (Metres)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Scale: {point1 && point2 ? `${Math.round(Math.hypot(point2.x - point1.x, point2.y - point1.y))} px = ${knownDistance}m` : 'Uncalibrated'}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={knownDistance}
                  onChange={(e) => setKnownDistance(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
                <span className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs flex items-center">
                  metres
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Provide the distance of a known track marker, hurdle, or athlete height to calibrate metric speed (m/s).
              </p>
            </div>

            {/* Interactive 2-Point Pixel Calibration Preview */}
            {videoPreviewUrl && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    2-Point Spatial Scale Reference (Click on video frame)
                  </span>
                  <button
                    onClick={() => {
                      setCalibrating(true);
                      setPoint1(null);
                      setPoint2(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      calibrating
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {calibrating ? 'Click 2 points on video' : 'Recalibrate Points'}
                  </button>
                </div>

                <div
                  onClick={handlePreviewClick}
                  className={`relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center cursor-crosshair border ${
                    calibrating ? 'ring-2 ring-yellow-400' : 'border-slate-800'
                  }`}
                >
                  <video
                    ref={previewVideoRef}
                    src={videoPreviewUrl}
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {/* Render calibration points & line */}
                  {point1 && (
                    <div
                      style={{ left: point1.x, top: point1.y }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-white pointer-events-none"
                    />
                  )}
                  {point2 && (
                    <div
                      style={{ left: point2.x, top: point2.y }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyanAccent border-2 border-white pointer-events-none"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Frame Sampling Interval & Processing Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Frame Sampling Interval</label>
                <select
                  value={sampleInterval}
                  onChange={(e) => setSampleInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value={1}>Every 1 Frame (Detailed 30+ FPS analysis)</option>
                  <option value={2}>Every 2 Frames (2x faster processing)</option>
                  <option value={3}>Every 3 Frames (High speed screening)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Processing Mode</label>
                <select
                  value={processingMode}
                  onChange={(e) => setProcessingMode(e.target.value as 'detailed' | 'fast')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                >
                  <option value="detailed">Detailed (Smoothed kinematic trajectories &amp; PDF)</option>
                  <option value="fast">Fast (Rapid event detection only)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Back
            </button>
            <button
              onClick={handleStartAnalysis}
              className="px-8 py-3.5 rounded-xl bg-primary text-slate-950 font-extrabold hover:bg-primary-hover transition-all flex items-center gap-2 text-sm sports-glow-lime"
            >
              <Zap size={18} className="fill-slate-950" />
              <span>Execute Biomechanical Analysis</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PROCESSING STAGE */}
      {currentStep === 4 && (
        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-surfaceBorder text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto animate-pulse sports-glow-lime">
            <Activity size={36} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white">Analyzing Video Kinematics</h3>
            <p className="text-xs text-slate-400 font-mono">
              {processingStage}
            </p>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto space-y-2">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPct}%` }}
                className="h-full bg-gradient-to-r from-primary to-cyanAccent transition-all duration-300"
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>MediaPipe Pose Landmarker Active</span>
              <span>{progressPct}%</span>
            </div>
          </div>

          {/* Pipeline stages list */}
          <div className="max-w-sm mx-auto space-y-2 text-left pt-4 border-t border-slate-800 text-xs">
            {[
              { label: 'Video frame extraction & decoding', threshold: 10 },
              { label: 'MediaPipe BlazePose 33-joint estimation', threshold: 30 },
              { label: 'Temporal trajectory smoothing (SciPy)', threshold: 70 },
              { label: 'Biomechanical event calculation', threshold: 85 },
              { label: 'Report generation (PDF / CSV / JSON)', threshold: 95 },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {progressPct >= p.threshold ? (
                  <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-700 flex-shrink-0" />
                )}
                <span className={progressPct >= p.threshold ? 'text-slate-200' : 'text-slate-500'}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
