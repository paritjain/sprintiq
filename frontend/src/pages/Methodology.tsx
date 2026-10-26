import React from 'react';
import {
  BookOpen,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Code2,
} from 'lucide-react';

export const Methodology: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      {/* Page Title & Academic Header */}
      <div className="space-y-3 border-b border-surfaceBorder pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold">
          <span>BITS Pilani &bull; Introduction to Sports Engineering &bull; Assignment 2 (Project 7)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Methodology &amp; Biomechanical Theory
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          Technical documentation of the video-based athletic kinematic analysis architecture, MediaPipe pose tracking, signal filtering, and validation principles.
        </p>
      </div>

      {/* 1. Problem Definition */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">01.</span> Problem Definition
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            Project 7 requires developing an automated, video-based computational system for engineering analysis and performance assessment of sprinting or jumping events. The system must extract relevant motion and biomechanical parameters from monocular video footage and use them to assess athletic execution and support event-specific judgement.
          </p>
          <p>
            Traditional sports biomechanics relies on specialized multi-camera optoelectronic capture suites (e.g. Vicon, Qualisys) with retroreflective markers or ground-embedded force plates. While highly accurate, these laboratory systems are expensive, geographically restricted, and invasive to competitive competition. SprintIQ demonstrates that monocular computer vision paired with modern deep-learning pose estimation can reliably approximate critical kinematic variables (step cadence, step timing variability, flight time, and displacement) in non-laboratory settings.
          </p>
        </div>
      </section>

      {/* 2. Motivation and Real-World Relevance */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">02.</span> Motivation &amp; Real-World Relevance
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            In athletic sprinting, velocity is the mathematical product of step frequency (cadence) and step length ($v = f \times l$). Detecting asymmetry in ground contact time or step frequency drop-offs under fatigue informs training interventions and race-pace pacing strategies.
          </p>
          <p>
            In horizontal jumping (long jump / triple jump), jump distance is governed by take-off run-up speed, take-off angle, and aerial flight time. Automated event detection provides coaches and athletes with immediate, objective kinematic metrics without manual frame-by-frame stopwatches.
          </p>
        </div>
      </section>

      {/* 3. System Architecture */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">03.</span> System Architecture
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder space-y-6">
          <p className="text-sm text-slate-300">
            SprintIQ follows a decoupled full-stack architecture with a React/Vite/Tailwind client interfacing with a high-performance Python FastAPI computer vision microservice:
          </p>

          {/* Architecture Pipeline Diagram */}
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="text-xs font-mono font-bold text-primary uppercase tracking-wider text-center">
              End-to-End Computational Pipeline
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center text-center text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">
                Video Input (MP4/MOV)
              </div>
              <div className="text-primary font-bold hidden sm:block">&rarr;</div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">
                OpenCV Decoding &amp; FPS Extraction
              </div>
              <div className="text-primary font-bold hidden sm:block">&rarr;</div>
              <div className="p-3 rounded-xl bg-slate-900 border border-primary text-primary font-bold sports-glow-lime">
                MediaPipe Pose Landmarker (33 Pts)
              </div>
              <div className="text-primary font-bold hidden sm:block">&rarr;</div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">
                SciPy Smoothing &amp; Event Detection
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <div className="text-xs font-mono text-cyanAccent text-center max-w-md">
                &darr; Metrics Calculation &amp; Rule Engine &darr;<br />
                <span className="text-white font-bold">Synchronized Video Canvas Visualizer &amp; PDF Export</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Video Acquisition and Preprocessing */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">04.</span> Video Acquisition &amp; Preprocessing
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            OpenCV (<code className="text-cyanAccent">cv2.VideoCapture</code>) decodes video streams, extracts intrinsic header metadata (resolution, frame count, frames per second), and samples frames at a user-configurable interval.
          </p>
          <p>
            Frame timestamps are computed deterministically as:
          </p>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-primary text-center">
            t_i = i / FPS
          </div>
          <p>
            A video sanity check verifies that FPS falls within valid physiological thresholds (10 &le; FPS &le; 300) and confirms decodability before queuing inference.
          </p>
        </div>
      </section>

      {/* 5. Human Pose Estimation */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">05.</span> Human Pose Estimation (MediaPipe)
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            Pose estimation is performed using the Google MediaPipe Tasks Pose Landmarker API (<code className="text-cyanAccent">mediapipe.tasks.python.vision.PoseLandmarker</code>), backed by the BlazePose convolutional model topology.
          </p>
          <p>
            The model infers 33 full-body anatomical landmark coordinates:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
            <li><strong>Pelvis / Hip Midpoint (Indices 23, 24):</strong> Serves as the primary 2D proxy for whole-body horizontal translation.</li>
            <li><strong>Knees (Indices 25, 26):</strong> Track knee flexion and thigh forward drive angle.</li>
            <li><strong>Ankles &amp; Feet (Indices 27 to 32):</strong> Left and right ankles, heels, and foot indices used for stance-phase and foot-strike event extraction.</li>
          </ul>
        </div>
      </section>

      {/* 6. Biomechanical Parameter Extraction */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">06.</span> Biomechanical Parameter Extraction
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm mb-1">A. Sprint Cadence Formulation</h3>
            <p className="text-xs text-slate-400 mb-2">
              Step cadence (step frequency) expresses the rate of foot contacts per minute:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-primary text-center">
              Cadence (steps/min) = [ N_steps / (t_end - t_start) ] &times; 60
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-1">B. Step &amp; Stride Timing</h3>
            <p className="text-xs text-slate-400">
              Step time (&Delta;t_step) represents the interval between consecutive alternating foot strikes (left-to-right or right-to-left). Stride time (&Delta;t_stride) measures consecutive contacts of the same foot. Bilateral step symmetry ratio is computed as:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyanAccent text-center">
              Symmetry Ratio = Mean Left Step Time / Mean Right Step Time
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-1">C. Calibrated Velocity Profile</h3>
            <p className="text-xs text-slate-400 mb-2">
              When 2D spatial calibration is supplied ($px/m$), instantaneous velocity is calculated by differentiating the Savitzky-Golay smoothed hip displacement:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-primary text-center">
              v(t) = [ (x(t + &Delta;t) - x(t)) / Scale_px_per_m ] / &Delta;t
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white text-sm mb-1">D. Long Jump Flight Time &amp; Displacement</h3>
            <p className="text-xs text-slate-400 mb-2">
              Flight time is determined from detected take-off and landing frames:
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyanAccent text-center">
              t_flight = t_landing - t_takeoff
            </div>
          </div>
        </div>
      </section>

      {/* 7. Event Detection */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">07.</span> Event Detection &amp; Signal Processing
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            Raw pose coordinate sequences contain high-frequency pixel jitter caused by camera compression artifacts and model bounding-box adjustments. SprintIQ applies a 2nd-order Savitzky-Golay polynomial smoothing filter (<code className="text-cyanAccent">scipy.signal.savgol_filter</code>).
          </p>
          <p>
            Foot strike ground contact events correspond to local maxima in the ankle vertical displacement signal (in image coordinates where y points downwards). Discrete foot strikes are extracted using <code className="text-cyanAccent">scipy.signal.find_peaks</code> with a physiological refractory period constraint (&ge; 0.28 seconds per leg) to prevent false double-counting.
          </p>
        </div>
      </section>

      {/* 8. Spatial Calibration */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">08.</span> Spatial Calibration &amp; Coordinate Spaces
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            The system explicitly separates four coordinate spaces:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
            <li><strong>Normalized Coordinates ($[0, 1]$):</strong> Frame-size invariant ratios generated directly by MediaPipe.</li>
            <li><strong>Pixel Coordinates ($[px]$):</strong> Product of normalized coordinates and video width/height.</li>
            <li><strong>Calibrated Metric Space ($[m]$):</strong> Planar scaling derived from a known real-world 2-point reference.</li>
            <li><strong>Uncalibrated Pixel Metrics:</strong> When calibration is omitted, distance is strictly labeled in pixels to prevent false scientific claims.</li>
          </ul>
        </div>
      </section>

      {/* 9. Validation and Testing */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">09.</span> Validation &amp; Automated Testing
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            The backend is validated through comprehensive unit and integration tests using <code className="text-cyanAccent">pytest</code>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
            <li>Health check endpoint availability and model weight existence.</li>
            <li>Video file format rejection (e.g. non-video uploads).</li>
            <li>Cadence and velocity calculation consistency against synthetic ground-truth kinematic signals.</li>
            <li>Zero-division and missing-landmark error handling.</li>
            <li>Export generation (JSON, CSV, PDF report compilation).</li>
          </ul>
        </div>
      </section>

      {/* 10. Assumptions & Limitations */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">10.</span> Assumptions &amp; Limitations
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            As an engineering demonstration prototype, the system operates under documented physical assumptions:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
            <li><strong>Planar Motion:</strong> Assumes athletic motion occurs primarily in the 2D plane perpendicular to the camera optical axis. Frontal camera angles induce foreshortening errors.</li>
            <li><strong>Monocular Depth Ambiguity:</strong> 2D monocular tracking cannot directly measure out-of-plane rotational torque or 3D ground reaction forces.</li>
            <li><strong>Temporal Nyquist Limit:</strong> Standard 30 FPS cameras provide a temporal resolution of 33.3ms per frame. High-speed 120+ FPS captures significantly improve foot-strike precision.</li>
            <li><strong>Center of Mass Proxy:</strong> The hip midpoint is used as an approximate anatomical proxy for whole-body center of mass, as full segment-mass inertial modeling is beyond monocular 2D video.</li>
          </ul>
        </div>
      </section>

      {/* 11. IEEE References */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-mono text-sm">11.</span> Scientific References (IEEE Format)
        </h2>
        <div className="p-6 rounded-2xl bg-card border border-surfaceBorder text-slate-300 text-xs font-mono space-y-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed">
            [1] V. Bazarevsky, I. Grishchenko, K. Raveendran, T. Zhu, F. Zhang, and M. Grundmann, &ldquo;BlazePose: On-device Real-time Body Pose tracking,&rdquo; <i>arXiv preprint arXiv:2006.10204</i>, 2020.
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed">
            [2] G. Bradski, &ldquo;The OpenCV Library,&rdquo; <i>Dr. Dobb&apos;s Journal of Software Tools</i>, 2000.
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed">
            [3] A. Savitzky and M. J. E. Golay, &ldquo;Smoothing and Differentiation of Data by Simplified Least Squares Procedures,&rdquo; <i>Analytical Chemistry</i>, vol. 36, no. 8, pp. 1627–1639, 1964.
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed">
            [4] R. Bartlett, <i>Introduction to Sports Biomechanics: Analysing Human Movement Patterns</i>, 3rd ed. London: Routledge, 2014.
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 leading-relaxed">
            [5] N. P. Linthorne, &ldquo;Analysis of standing long jump,&rdquo; <i>Sports Biomechanics</i>, vol. 7, no. 1, pp. 88–98, 2008.
          </div>
        </div>
      </section>
    </div>
  );
};
