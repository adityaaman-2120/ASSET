<div align="center">

# 📊 ASSET

### The AI Portfolio Engine — Quant Trading Intelligence Platform

_From one investor profile to a regime-aware, self-critiquing, crash-tested portfolio_

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)
![React](https://img.shields.io/badge/React-Vite-61DAFB.svg)
![XGBoost](https://img.shields.io/badge/XGBoost-ML-EB5E28.svg)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3-purple.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

## 🎯 Overview

**ASSET** is an AI-powered quantitative investing platform that turns a plain-language investor profile into a mathematically optimized, fully explained, and stress-tested portfolio.

Most retail tools predict prices and stop there. ASSET goes further: it reads the current **market regime**, builds a portfolio adapted to it, **explains every holding** in plain English, **argues with its own decisions** to expose hidden risk, and **proves the portfolio survives historical crashes** — all with returns reported **net of real trading costs**.

> **Educational paper-trading simulator — virtual money, real market data, not financial advice.**

---

## ✨ What Makes ASSET Different

Three capabilities separate ASSET from a typical stock screener:

### 🏆 1. Regime-Aware Intelligence
A Hidden Markov Model reads two years of NIFTY 50 data to classify the current market into **Bull / Bear / High-Volatility / Sideways**, then adapts the strategy. In a bearish regime, ASSET automatically shifts to a defensive allocation and raises a 30% cash buffer — because you shouldn't build a crash portfolio the same way you build a boom portfolio.

### 🏆 2. The Devil's Advocate Agent
After a portfolio is built, a second AI attacks it. It computes real metrics from live price data — sector concentration, single-stock exposure, pairwise correlations — and produces severity-ranked risk warnings that cite the actual numbers. A system honest enough to critique itself is one you can trust.

### 🏆 3. Historical Crash Stress-Test
One action replays the **2008 financial crisis, the COVID-2020 crash, and the 2022 selloff** against the user's exact holdings, using real historical price data, and compares the outcome to a NIFTY buy-and-hold benchmark — net of trading costs.

---

## 🚀 Features

| Feature | Description |
| --- | --- |
| **Investor Profiling** | Multi-step onboarding (capital, risk, horizon, sectors, style, free-text goal) |
| **Technical Indicators** | RSI, MACD, Bollinger Bands, Moving Averages, Volume — each translated to plain English |
| **ML Signal Engine** | XGBoost predicts Buy / Hold / Sell with confidence, using balanced quantile-based labels |
| **Portfolio Optimizer** | Markowitz / Efficient Frontier via PyPortfolioOpt, tuned to the user's risk level |
| **Regime Detection** | HMM-based market-state classifier with adaptive allocation |
| **Devil's Advocate** | Self-critiquing risk agent grounded in live correlation and concentration data |
| **Crash Stress-Test** | Real 2008 / COVID / 2022 replay vs NIFTY buy-and-hold |
| **What-If Simulator** | Add capital or remove a holding → live re-optimization of return, risk, and Sharpe |
| **Transaction Costs** | Brokerage, STT, and slippage subtracted — returns shown net of real costs |
| **Confidence Cones** | 2,000-path Monte Carlo forecast showing a realistic range, not a single line |
| **AI Insights & Goal Tracker** | Plain-English alerts and progress tracking toward the user's stated goal |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Investor Profile  →  Regime Detector  →  ML + Optimizer      │
│       (React)            (HMM)         (XGBoost + PyPortfolioOpt)│
│                              ↓                                  │
│      Explain & Attack (SHAP-style reasons + Devil's Advocate)  │
│                              ↓                                  │
│         Crash Stress-Test  →  Live Interactive Dashboard       │
└──────────────────────────────────────────────────────────────┘
```

| Layer | Technologies |
| --- | --- |
| **Frontend** | React · Vite · Recharts · Tailwind CSS · Zustand |
| **Backend** | FastAPI · Uvicorn · Pydantic |
| **AI / LLM** | Groq API (Llama 3.3) — NL parsing, insights, Devil's Advocate |
| **Machine Learning** | XGBoost · scikit-learn · hmmlearn |
| **Quant Finance** | PyPortfolioOpt · pandas-ta · NumPy · SciPy |
| **Market Data** | yfinance (live, cached for demo safety) |

---

## 📦 Project Structure

```
ASSET/
├── quant-invest/
│   ├── backend/
│   │   ├── main.py              # FastAPI app + endpoints
│   │   ├── indicators.py        # Technical indicator engine
│   │   ├── ml_model.py          # XGBoost training + prediction
│   │   ├── regime.py            # HMM regime detection
│   │   ├── devils_advocate.py   # Self-critiquing risk agent
│   │   ├── stress_test.py       # Historical crash replay
│   │   └── requirements.txt
│   └── src/
│       ├── pages/               # Onboarding, ProfileSummary, Dashboard
│       ├── components/          # Onboarding + portfolio UI
│       ├── api/                 # Axios client
│       └── store/               # Zustand investor store
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### Backend Setup

```bash
cd quant-invest/backend
pip install -r requirements.txt

# Set your Groq API key
export GROQ_API_KEY=your_groq_api_key   # Windows: set GROQ_API_KEY=...

# Train the ML model (generates stock_model.pkl)
python ml_model.py

# Run the API server
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd quant-invest
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## 🔌 Key API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/fetch-stocks` | Fetch live OHLCV by sector |
| `POST` | `/api/predict-signals` | XGBoost Buy/Hold/Sell signals |
| `POST` | `/api/optimize-portfolio` | Regime-aware portfolio optimization |
| `GET` | `/api/detect-regime` | Current market regime (HMM) |
| `POST` | `/api/devils-advocate` | Self-critiquing risk analysis |
| `POST` | `/api/stress-test` | Historical crash replay |
| `POST` | `/api/what-if` | Live re-optimization simulator |
| `POST` | `/api/generate-insights` | Plain-English AI insights |

---

## 🧪 Design Philosophy — Honesty First

ASSET deliberately avoids the inflated numbers common in student trading projects:

- **No fake accuracy claims.** Models are validated honestly with Sharpe ratio and max drawdown against a buy-and-hold benchmark.
- **Net of real costs.** Returns subtract brokerage, STT, and slippage — most tools quietly show gross figures.
- **Transparent data coverage.** The stress-test reports how many holdings had data for each historical window rather than faking full coverage.
- **Ranges, not false precision.** Forecasts use Monte Carlo confidence cones instead of a single confident line.

---

## 🛣️ Production Roadmap

The current build is a lean MVP. The architecture is designed to scale to production by adding:

- JWT authentication (email/password + Google OAuth)
- PostgreSQL persistence (users, profiles, portfolios, holdings, history, insights, stress-test results)
- Redis caching layer and S3-backed historical data
- Containerized deployment (Vercel + Railway)

---

## ⚠️ Disclaimer

> ASSET is for **educational and informational purposes only**. All portfolios are **simulated (paper trading)** with virtual money against real market data. Past performance and stress-test results do not guarantee future outcomes. This is **not financial advice** — consult a SEBI-registered advisor before making real investment decisions.

---

## 📄 License

Released under the [MIT License](LICENSE).

---

<div align="center">

**Built for the Ignite Room Hackathon — IIIT Delhi**

_Other platforms predict prices. ASSET reads the regime, argues with itself, and proves it survives crashes._

</div>
