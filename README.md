# SprintIQ — AI-Powered Sports Biomechanics & Performance Analysis

[![BITS Pilani Sports Engineering](https://img.shields.io/badge/BITS%20Pilani-Sports%20Engineering%20Assignment%202%20(Project%207)-06B6D4.svg)](https://www.bits-pilani.ac.in/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20OpenCV%20%2B%20MediaPipe-10E76E.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript%20%2B%20Vite%20%2B%20Tailwind-38BDF8.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-8%20Passed%20(pytest)-emerald.svg)](backend/tests/)

> **"Turn Athletic Movement into Measurable Performance."**  
> *Measure Motion. Understand Performance.*

**SprintIQ** is an automated video-based sports biomechanics and performance assessment platform developed for **BITS Pilani Introduction to Sports Engineering Assignment 2, Project 7**:
> *"Develop an automated video-based system for engineering analysis and performance assessment of sprinting or jumping events. Extract relevant motion/biomechanical parameters from publicly available video or a simplified dataset, and use them to assess performance and/or support event-specific judgement."*

---

## 🌟 Key Capabilities

- **100% Genuine Computer Vision**: Powered by Google MediaPipe Tasks Pose Landmarker (`pose_landmarker_full.task`, 33-joint BlazePose topology) and OpenCV for frame decoding and skeletal rendering.
- **Sprint Biomechanics Engine**:
  - Contralateral foot-strike detection using ankle trajectory vertical peaks (`scipy.signal.find_peaks`).
  - Cadence calculation: $\text{Cadence (spm)} = \left(\frac{N_{\text{steps}}}{\Delta t}\right) \times 60$.
  - Step timing variability (standard deviation) and bilateral step symmetry ratio ($L/R$).
  - Instantaneous and average velocity profiles ($v(t)$ and $v_{\text{avg}}$) using Savitzky-Golay polynomial differentiation when calibrated.
- **Long Jump Biomechanics Engine**:
  - Candidate take-off and sandpit landing event detection from hip proxy vertical trajectory.
  - Ballistic flight time estimation ($t_{\text{flight}} = t_{\text{landing}} - t_{\text{takeoff}}$).
  - Horizontal displacement proxy ($\Delta x$) in calibrated metres or pixels.
  - Initial take-off projection angle approximation ($\theta = \arctan(v_y / v_x)$).
- **Spatial Scale Calibration**:
  - 2D planar reference calibration ($px/m$) using two interactive points separated by a known real-world distance.
  - Strict scientific distinction between calibrated metres and uncalibrated pixel measurements to prevent fabricated claims.
- **Synchronized Video & Pose Player**:
  - Frame-by-frame navigation ($1/\text{FPS}$ steps).
  - Canvas overlay rendering synchronized to video timestamps.
  - Toggle between raw video and OpenCV backend-annotated video.
  - Real-time pose confidence meter.
- **Rule-Based Observation Engine**:
  - Generates analytical indicators grounded strictly in computed metrics (cadence ranges, timing variability, tracking gaps, perspective foreshortening warnings).
- **Downloadable Academic Reports**:
  - Printable, professional PDF reports compiled with ReportLab.
  - Raw CSV kinematics time-series export.
  - Complete JSON structured session data.
- **Athlete Comparison & Validation Tool**:
  - Side-by-side differential analysis ($\Delta$ calculations with underlying formulas).
  - Measurement compatibility notices (warning on camera view or calibration mismatches).
  - Empirical validation interface comparing automated event timestamps against manual ground-truth review.
- **Bundled Legally Clear Demonstration Trials**:
  - Built-in OpenCV kinematic video generator that synthesizes realistic athletic sprint and long jump trials for instant offline evaluation without external URL dependencies.

---

## 🏗️ Architecture & Technology Stack

```
Video Input (.mp4 / .mov / .avi)
  │
  ├──► OpenCV VideoProcessor (cv2.VideoCapture, metadata extraction, frame sampling)
  │      │
  │      └──► MediaPipe Pose Landmarker (33 keypoint BlazePose coordinates & confidence)
  │             │
  │             ├──► SciPy Signal Processing (Savitzky-Golay smoothing, peak detection)
  │             │      │
  │             │      └──► BiomechanicsEngine (Cadence, Velocity, Flight Time, Symmetry)
  │             │             │
  │             │             ├──► Rule Engine (Analytical findings & limitation notices)
  │             │             │
  │             │             └──► Report Generator (ReportLab PDF, CSV, JSON)
  │             │
  │             └──► Annotated Video Renderer (Skeletal overlay MP4 export)
  │
  └──► FastAPI REST API (`http://127.0.0.1:8000`)
         ▲
         │ TanStack Query & REST Fetch
         ▼
       React + Vite + TypeScript Client (`http://127.0.0.1:5173`)
       (Tailwind CSS, Recharts, Framer Motion, Lucide Icons, Sonner)
```

---

## 🚀 Quickstart & Setup (Windows)

### Prerequisites
- Python 3.11 or later
- Node.js v18 or later (Tested with Node v24)
- npm v10 or later

### 1. Backend Setup
Open a terminal in the project root:
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Download MediaPipe Pose Landmarker model weights (if not present)
python -c "
import urllib.request, os
from pathlib import Path
p = Path('models_weights/pose_landmarker_full.task')
p.parent.mkdir(parents=True, exist_ok=True)
if not p.exists():
    print('Downloading pose_landmarker_full.task...')
    urllib.request.urlretrieve('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task', str(p))
print('Model ready:', p.exists())
"

# Run automated tests
pytest tests/

# Launch FastAPI Backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Backend API will be running at `http://127.0.0.1:8000`  
Interactive Swagger docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
In a second terminal window:
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Build production bundle (verifies TypeScript types)
npm run build

# Start Vite development server
npm run dev -- --host 127.0.0.1 --port 5173
```
Open your browser at `http://127.0.0.1:5173`.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status, MediaPipe version, and model weight verification |
| `GET` | `/api/analyses` | List all stored analysis sessions |
| `POST` | `/api/analyses` | Upload video file with spatial calibration configuration |
| `POST` | `/api/analyses/load-demo/{event_type}` | Execute bundled kinematic demonstration trial (sprint / jump) |
| `GET` | `/api/analyses/{id}` | Retrieve comprehensive session metrics, events, and time-series |
| `GET` | `/api/analyses/{id}/landmarks` | Retrieve full 33-joint frame-by-frame coordinate sequence |
| `GET` | `/api/analyses/{id}/events` | Retrieve detected discrete movement milestones |
| `GET` | `/api/analyses/{id}/export?format=json\|csv\|pdf` | Download analysis report in PDF, CSV, or JSON format |
| `DELETE` | `/api/analyses/{id}` | Permanently remove session and associated media artifacts |

---

## 🔬 Mathematical Formulations

### 1. Step Cadence
$$\text{Cadence (steps/min)} = \frac{N_{\text{detected steps}}}{t_{\text{end}} - t_{\text{start}}} \times 60$$

### 2. Spatial Scale Factor
$$\text{Scale}_{px/m} = \frac{\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}}{D_{\text{known (metres)}}}$$

### 3. Forward Speed (Calibrated)
$$v(t) = \frac{x_{\text{hip}}(t + \Delta t) - x_{\text{hip}}(t)}{\text{Scale}_{px/m} \cdot \Delta t}$$
$$v_{\text{avg}} = \frac{|x_{\text{hip}}(t_{\text{end}}) - x_{\text{hip}}(t_{\text{start}})|}{\text{Scale}_{px/m} \cdot (t_{\text{end}} - t_{\text{start}})}$$

### 4. Jump Flight Time
$$t_{\text{flight}} = t_{\text{landing}} - t_{\text{takeoff}}$$

---

## 📚 References (IEEE Format)

1. V. Bazarevsky, I. Grishchenko, K. Raveendran, T. Zhu, F. Zhang, and M. Grundmann, "BlazePose: On-device Real-time Body Pose tracking," *arXiv preprint arXiv:2006.10204*, 2020.
2. G. Bradski, "The OpenCV Library," *Dr. Dobb's Journal of Software Tools*, 2000.
3. A. Savitzky and M. J. E. Golay, "Smoothing and Differentiation of Data by Simplified Least Squares Procedures," *Analytical Chemistry*, vol. 36, no. 8, pp. 1627–1639, 1964.
4. R. Bartlett, *Introduction to Sports Biomechanics: Analysing Human Movement Patterns*, 3rd ed. London: Routledge, 2014.
5. N. P. Linthorne, "Analysis of standing long jump," *Sports Biomechanics*, vol. 7, no. 1, pp. 88–98, 2008.

---

## 🛡️ License & Academic Integrity
Developed for academic assessment in **Introduction to Sports Engineering (Assignment 2, Project 7)** at **BITS Pilani**. Model weights (`pose_landmarker_full.task`) are distributed by Google under the Apache 2.0 license.
