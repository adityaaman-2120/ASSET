# ASSETS — How to Run

## Structure
```
ASSETS/
  frontend/   ← React app (homepage + portfolio app combined) — port 5173
  backend/    ← FastAPI server — port 8000
```

## Start (2 terminals only)

**Terminal 1 — Frontend:**
```
cd C:\Users\krish\Desktop\ASSETS\frontend
npm run dev
```
→ Open http://localhost:5173

**Terminal 2 — Backend:**
```
cd C:\Users\krish\Desktop\ASSETS\backend
py -3.12 -m uvicorn main:app --reload --port 8000
```

## Routes
- http://localhost:5173              → Homepage
- http://localhost:5173/onboarding  → Fill your profile
- http://localhost:5173/summary     → Profile summary
- http://localhost:5173/dashboard   → Full dashboard
