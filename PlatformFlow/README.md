# PlatformFlow — Nationwide Railway Timetable and Intelligent Platform Planning System

PlatformFlow is an intelligent decision-support web platform designed for railway operations planning, timetable time-window filtering, conflict detection, and greedy platform allocation across Indian Railway stations.

Built with **React 19 + TypeScript + Vite** for the frontend, **Python FastAPI + SQLite (WAL Mode)** for the backend, and high-performance **Data Structures & Algorithms (DSA)** for operations simulation.

---

## 🌟 Key Features

1. **Nationwide Station & Train Search:**
   - Search across 55+ major Indian Railway stations (NDLS, CSMT, HWH, MAS, SBC, TPTY, PUNE, ADI, CNB, BSB, etc.) by station code, name, state, or zone.
   - Search trains by train number (e.g. `12951`, `22436`, `12004`) or name (e.g. `Rajdhani`, `Vande Bharat`, `Shatabdi`).
   - Detailed train profile modal with complete intermediate stops, halt durations, cumulative distances in kilometers, and running days.

2. **Time-Window Filtering & Midnight Crossing:**
   - Filter station arrivals and departures by time range (e.g. `16:00` to `20:00`).
   - **Full Midnight Crossing Support:** Windows that cross midnight (e.g. `22:00` to `04:00`) or trains whose stay spans across midnight (e.g. arrival `23:50`, departure `00:20`) are accurately calculated using modular and decomposed interval intersection algorithms.

3. **Intelligent Platform Planning Dashboard:**
   - Interactive visual platform occupancy timeline (Gantt chart) for platforms 1 to $K$.
   - Real-time conflict detection highlighting overlapping train occupancies and safety headway buffer violations.
   - **Platform Assignment Simulator:** Test assigning any train to a candidate platform in real time with instant feasibility and clearance verification.
   - **One-Click Greedy Platform Allocation:** Dynamically colors platform intervals and balances traffic across available loop lines.

4. **Conflict Analysis & Avoidable Waiting Estimation:**
   - Side-by-side comparison between the Baseline Schedule (rigid preferences) and the Flow-Balanced Plan.
   - Estimates avoidable holding minutes based on headway clearance buffers and signal caution elimination, with explicit operational assumptions.

5. **DSA Architecture & Educational Visualizer:**
   - **Hash Maps ($O(1)$)** & Inverted Search Index for instantaneous lookup and autocomplete.
   - **Sorting ($O(N \log N)$)** for chronological timetable sequencing.
   - **Interval-Overlap Detection ($O(1)$)** with headway safety buffer math.
   - **Min-Heap Priority Queue ($O(N \log K)$)** for chronological event processing.
   - **Greedy Platform Allocation ($O(N \log N + NK)$)** respecting train rake lengths and platform capacities.
   - **Graph Adjacency Lists with BFS & DFS ($O(V + E)$)**: Shortest junction hops (BFS) and alternative rail corridor exploration (DFS).
   - Dedicated interactive DSA sandbox in the UI to test mathematical formulas and heap operations live.

6. **Validated Data Import & Integrity:**
   - Import station directories, train timetable stops, and delay updates via CSV or JSON.
   - Strict schema validation with row-level error reporting.
   - All sample data is clearly tagged `DEMO_VALIDATED_DATASET` to ensure operational transparency.

---

## 📋 System Requirements (Windows)

- **Operating System:** Windows 10 or Windows 11
- **Python:** Python 3.10, 3.11, 3.12, 3.13, or 3.14 (Available via `python --version`)
- **Node.js:** Node.js v18+ and npm v9+ (Available via `node --version` and `npm --version`)

---

## 🚀 Quick Start Guide (Windows)

### Option 1: One-Click Startup (Recommended)

Simply double-click or run from PowerShell:

```powershell
.\run_all.bat
```

Or using PowerShell:

```powershell
.\run_all.ps1
```

This launches both the FastAPI backend server (Port 8000) and the Vite React frontend (Port 5173).

---

### Option 2: Manual Step-by-Step Startup

If you prefer to start each service manually in separate PowerShell or Command Prompt windows:

#### Step 1: Start Backend API Server
Open a terminal in the `PlatformFlow` project directory:

```powershell
# Install backend dependencies (if not already installed)
python -m pip install fastapi uvicorn pydantic pytest python-multipart

# Launch FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available at:
- **API Root & Built App:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### Step 2: Start Frontend Development Server
Open a second terminal window:

```powershell
cd frontend
npm install
npm run dev
```

Frontend will be available at:
- **Web UI:** [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running the Automated Test Suite

PlatformFlow comes with a comprehensive test suite covering all DSA algorithms, midnight window logic, interval overlap conditions, greedy scheduling, graph BFS/DFS, and API integration.

To run all tests:

```powershell
python -m pytest backend/tests -v
```

Or double-click:
```powershell
.\run_tests.bat
```

Expected output:
```
backend/tests/test_api.py::test_api_health PASSED
backend/tests/test_api.py::test_nationwide_station_search PASSED
backend/tests/test_api.py::test_nationwide_train_search PASSED
backend/tests/test_api.py::test_station_timetable_with_midnight_window PASSED
backend/tests/test_api.py::test_platform_timeline_and_allocation PASSED
backend/tests/test_api.py::test_simulate_manual_assignment PASSED
backend/tests/test_api.py::test_network_graph_route_bfs_and_dfs PASSED
backend/tests/test_api.py::test_import_validation PASSED
backend/tests/test_api.py::test_dsa_explanations PASSED
backend/tests/test_api.py::test_root_serves_frontend PASSED
backend/tests/test_dsa.py::test_time_conversions PASSED
backend/tests/test_dsa.py::test_overnight_window_detection PASSED
backend/tests/test_dsa.py::test_time_falls_in_window_midnight PASSED
backend/tests/test_dsa.py::test_interval_intersects_window_midnight PASSED
backend/tests/test_dsa.py::test_interval_overlap_detection PASSED
backend/tests/test_dsa.py::test_min_heap_priority_queue PASSED
backend/tests/test_dsa.py::test_greedy_platform_allocation PASSED
backend/tests/test_dsa.py::test_graph_bfs_and_dfs PASSED
backend/tests/test_dsa.py::test_avoidable_waiting_analysis PASSED

======================= 19 passed in 1.25s =======================
```

---

## 📂 Project Structure

```
PlatformFlow/
│
├── backend/                        # FastAPI Backend Application
│   ├── database.py                 # SQLite WAL connection and table schemas
│   ├── dsa_engine.py               # HashMaps, Intervals, Min-Heap, Greedy Allocator
│   ├── graph_engine.py             # Railway Network Adjacency Lists, BFS & DFS
│   ├── models.py                   # Pydantic data schemas
│   ├── seed_data.py                # 55+ Nationwide stations & 30+ iconic trains
│   ├── importer.py                 # CSV & JSON validation and ingestion
│   ├── main.py                     # REST API endpoints & static file serving
│   └── tests/                      # Automated test suite
│       ├── test_dsa.py             # Algorithm and math tests
│       └── test_api.py             # API endpoints and integration tests
│
├── frontend/                       # Modern React + TypeScript + Vite Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Top bar, branding, tab switches
│   │   │   ├── TimetableBoard.tsx  # Search, filters, midnight indicators, table
│   │   │   ├── PlatformPlanner.tsx # Gantt timeline, greedy allocation, simulator
│   │   │   ├── ConflictAnalyzer.tsx# What-If comparison & avoidable delay analysis
│   │   │   ├── NetworkExplorer.tsx # BFS/DFS route finder & junction sequence
│   │   │   ├── DSAHub.tsx          # Algorithm theory, complexities & live sandbox
│   │   │   ├── TrainDetailModal.tsx# Complete route sequence modal
│   │   │   └── DataImportModal.tsx # CSV/JSON upload modal & schema validation
│   │   ├── api.ts                  # Typed REST API client
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── index.css               # Modern railway operations design system
│   │   └── App.tsx                 # Root application component
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── data/                           # Data directory
│   ├── sample_stations_nationwide_DEMO.csv # Sample stations import template
│   ├── sample_trains_nationwide_DEMO.csv   # Sample trains import template
│   ├── sample_delays_feed_DEMO.json        # Sample delay update feed
│   ├── stations.json               # Original starter station file
│   ├── trains.json                 # Original starter trains file
│   └── trains.csv                  # Original starter CSV file
│
├── run_all.bat                     # Windows All-in-One Launcher
├── run_all.ps1                     # Windows PowerShell Launcher
├── run_backend.bat                 # Windows Backend Launcher
├── run_frontend.bat                # Windows Frontend Launcher
├── run_tests.bat                   # Windows Test Suite Launcher
├── README.md                       # Comprehensive Guide (This document)
└── README.txt                      # Original starter notes
```

---

## 📥 How to Import Custom Datasets

1. Open PlatformFlow in your browser ([http://localhost:5173](http://localhost:5173)).
2. Click **Import Data** in the top navigation bar.
3. Select your dataset target:
   - **Train Timetable Stops (CSV / JSON)**
   - **Station Directory (CSV / JSON)**
   - **Simulated Delay Updates (JSON Array)**
4. Click **Download DEMO Template** to inspect the required CSV columns or JSON schema.
5. Choose your file and click **Upload & Ingest**.
6. The system performs row-level validation and reports valid counts or specific line errors.

### Sample CSV Schemas:

**Station Directory CSV:**
```csv
code,name,zone,state,platform_count
NDLS,New Delhi,NR,Delhi,16
CSMT,Chhatrapati Shivaji Maharaj Terminus,CR,Maharashtra,18
TPTY,Tirupati,SCR,Andhra Pradesh,6
```

**Train Timetable CSV:**
```csv
train_number,train_name,station_code,station_name,arrival,departure,halt_minutes,route_sequence,service_days,data_source,verified
12951,Mumbai Tejas Rajdhani,MMCT,Mumbai Central,,17:00,0,1,MON-SUN,DEMO_VALIDATED,false
12951,Mumbai Tejas Rajdhani,ST,Surat,19:43,19:48,5,2,MON-SUN,DEMO_VALIDATED,false
12951,Mumbai Tejas Rajdhani,NDLS,New Delhi,08:32,,0,6,MON-SUN,DEMO_VALIDATED,false
```

---

## 🛠 Troubleshooting Common Issues

### 1. `Port 8000 already in use`
If another process is using port 8000, find and terminate it via PowerShell:
```powershell
Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
Or start FastAPI on another port:
```powershell
python -m uvicorn backend.main:app --port 8001 --reload
```

### 2. `Execution Policy` restriction in PowerShell
If PowerShell blocks scripts (`run_all.ps1`), allow script execution for the current user:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Or simply use `run_all.bat`.

### 3. Missing Python Modules
If `No module named ...` appears:
```powershell
python -m pip install fastapi uvicorn pydantic pytest python-multipart
```

### 4. Resetting to Clean Seed Data
If uploaded data becomes corrupted, click the **Refresh Icon** in the top right of the navigation bar, or execute:
```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/data/reset-demo"
```

---

## 🛡️ Operational & Safety Disclaimer

PlatformFlow is an academic decision-support prototype. It is **not** an approved railway interlocking, signalling, or dispatch system.
All platform allocations and delay savings represent simulated mathematical models. Real train operations require physical track circuit verification, points status confirmation, and authorization by approved Railway Operations Staff.


## Login and visual refresh (demo)
The current static frontend includes a demo login screen:
- Username: `stationmaster`
- Password: `platformflow123`

This is only a front-end demonstration gate, not production authentication. Do not use real passwords or deploy it as a security boundary. The static prototype's manual train records remain browser-local; shared cross-computer records require the FastAPI backend to be connected to the UI and a proper server-side login system.

## Platform allocation safeguards (October 2026)

- Ordinary services are allocated using balanced platform usage and full occupancy intervals rather than filling the lowest-numbered platform first.
- A minimum 10-minute planning clearance is included in ordinary service intervals.
- Rake-sharing links reserve one platform continuously from arrival until departure plus the configured clearance buffer.
- Station Master approval now checks both other train intervals and continuous rake-sharing reservations. A conflicting approval is blocked with an explanatory message.
- This is a manual-data planning prototype, not a live railway control system. Verify station counts, train timings, rake IDs and operational rules with official sources before real-world use.
