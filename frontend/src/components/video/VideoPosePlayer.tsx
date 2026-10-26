import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Eye,
  EyeOff,
  Layers,
  Gauge,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { FrameLandmarks, LandmarkPoint } from '../../types';
import { ApiService } from '../../services/api';

interface VideoPosePlayerProps {
  originalVideoUrl?: string;
  annotatedVideoUrl?: string;
  landmarks: FrameLandmarks[];
  fps?: number;
  duration?: number;
  onTimeUpdate?: (currentTime: number) => void;
  externalSeekTime?: number | null;
}

// MediaPipe 33 landmark skeleton connections
const SKELETON_PAIRS: [number, number][] = [
  [11, 12], // Shoulders
  [11, 13], [13, 15], // Left arm
  [12, 14], [14, 16], // Right arm
  [11, 23], [12, 24], // Torso sides
  [23, 24], // Pelvis / Hips
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31], // Left leg & foot
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32], // Right leg & foot
];

export const VideoPosePlayer: React.FC<VideoPosePlayerProps> = ({
  originalVideoUrl,
  annotatedVideoUrl,
  landmarks = [],
  fps = 30.0,
  duration = 0,
  onTimeUpdate,
  externalSeekTime = null,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [useAnnotatedStream, setUseAnnotatedStream] = useState<boolean>(false);
  const [currentConfidence, setCurrentConfidence] = useState<number>(0);

  // Sync external seek time from event timeline click
  useEffect(() => {
    if (externalSeekTime !== null && videoRef.current) {
      videoRef.current.currentTime = externalSeekTime;
      setCurrentTime(externalSeekTime);
    }
  }, [externalSeekTime]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Step frame by frame
  const stepFrame = (deltaFrames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const frameDuration = 1.0 / (fps || 30.0);
    const newTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + deltaFrames * frameDuration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Draw skeleton overlay on HTML5 Canvas synchronized to currentTime
  const renderSkeleton = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !showOverlay || useAnnotatedStream) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas dimension to video display rect
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0) return;

    // Find the closest landmark frame to the current timestamp
    let closestFrame: FrameLandmarks | null = null;
    let minDiff = 0.15; // Max 150ms tolerance

    for (const flm of landmarks) {
      const diff = Math.abs(flm.timestamp_s - time);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = flm;
      }
    }

    if (!closestFrame || !closestFrame.landmarks || closestFrame.landmarks.length < 33) {
      setCurrentConfidence(0);
      return;
    }

    setCurrentConfidence(closestFrame.mean_confidence || 0);

    const ptsMap = new Map<number, { x: number; y: number; vis: number }>();
    closestFrame.landmarks.forEach((lm) => {
      ptsMap.set(lm.id, {
        x: lm.x * canvas.width,
        y: lm.y * canvas.height,
        vis: lm.visibility,
      });
    });

    // Draw skeletal connections
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    SKELETON_PAIRS.forEach(([p1Id, p2Id]) => {
      const p1 = ptsMap.get(p1Id);
      const p2 = ptsMap.get(p2Id);
      if (p1 && p2 && p1.vis > 0.35 && p2.vis > 0.35) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        // Lower body limbs cyan, upper body electric lime
        ctx.strokeStyle = p1Id >= 23 || p2Id >= 23 ? '#06B6D4' : '#10E76E';
        ctx.stroke();
      }
    });

    // Draw landmark keypoint dots
    ptsMap.forEach((pt, lmId) => {
      if (pt.vis > 0.35) {
        const isKeyJoint = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32].includes(lmId);
        const radius = isKeyJoint ? 5 : 3.5;

        // Outer glow
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius + 2, 0, 2 * Math.PI);
        ctx.fillStyle = isKeyJoint ? 'rgba(6, 182, 212, 0.4)' : 'rgba(16, 231, 110, 0.4)';
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isKeyJoint ? '#38BDF8' : '#10E76E';
        ctx.fill();

        // Inner white highlight
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius - 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    });
  }, [landmarks, showOverlay, useAnnotatedStream]);

  // Video time update event handler
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    onTimeUpdate?.(t);
    renderSkeleton(t);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const activeVideoUrl = useAnnotatedStream
    ? ApiService.getMediaUrl(annotatedVideoUrl || originalVideoUrl)
    : ApiService.getMediaUrl(originalVideoUrl);

  return (
    <div className="bg-card rounded-2xl border border-surfaceBorder overflow-hidden flex flex-col shadow-xl">
      {/* Top player bar */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-surfaceBorder flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Biomechanical Motion Tracker
          </span>
        </div>

        {/* Confidence & Mode toggles */}
        <div className="flex items-center gap-2 text-xs">
          {/* Pose confidence pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
            <Gauge className="w-3.5 h-3.5 text-cyanAccent" />
            <span className="text-slate-400 font-mono">Confidence:</span>
            <span
              className={`font-mono font-bold ${
                currentConfidence > 0.65
                  ? 'text-primary'
                  : currentConfidence > 0.4
                  ? 'text-yellow-400'
                  : 'text-slate-400'
              }`}
            >
              {(currentConfidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Skeleton Overlay toggle */}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showOverlay
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle skeletal overlay rendering"
          >
            {showOverlay ? <Eye size={14} /> : <EyeOff size={14} />}
            <span className="hidden sm:inline">Skeleton</span>
          </button>

          {/* Source Toggle: Raw vs Annotated */}
          {annotatedVideoUrl && (
            <button
              onClick={() => setUseAnnotatedStream(!useAnnotatedStream)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                useAnnotatedStream
                  ? 'bg-cyanAccent/15 border-cyanAccent/40 text-cyanAccent'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Toggle between original video and backend OpenCV annotated stream"
            >
              <Layers size={14} />
              <span className="hidden sm:inline">
                {useAnnotatedStream ? 'Backend Render' : 'Canvas Render'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Video & Canvas Stage */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {activeVideoUrl ? (
          <>
            <video
              ref={videoRef}
              src={activeVideoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              playsInline
            />
            {/* Skeletal tracking canvas overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none w-full h-full object-contain"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 text-sm">
            <span>Video source unavailable</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="p-4 bg-slate-900/60 border-t border-surfaceBorder space-y-3">
        {/* Scrub Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 w-12 text-right">
            {currentTime.toFixed(2)}s
          </span>
          <input
            type="range"
            min={0}
            max={videoDuration || 1}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (videoRef.current) {
                videoRef.current.currentTime = val;
              }
            }}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs font-mono text-slate-500 w-12">
            {(videoDuration || 0).toFixed(2)}s
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            {/* Step back 1 frame */}
            <button
              onClick={() => stepFrame(-1)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Step back 1 frame"
            >
              <SkipBack size={14} />
            </button>

            {/* Play / Pause button */}
            <button
              onClick={togglePlay}
              className="px-4 py-2 rounded-xl bg-primary text-slate-950 font-bold hover:bg-primary-hover transition-all flex items-center gap-2 sports-glow-lime text-xs sm:text-sm"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Step forward 1 frame */}
            <button
              onClick={() => stepFrame(1)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Step forward 1 frame"
            >
              <SkipForward size={14} />
            </button>

            {/* Reset */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Restart video"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {[0.25, 0.5, 1.0].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  playbackSpeed === spd
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
