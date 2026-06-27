# ASSETS

A monorepo for the **ASSETS** platform — a FastAPI backend and a React + Vite + TailwindCSS frontend, backed by a local PostgreSQL database.

```
ASSETS/
  backend/     # FastAPI + SQLAlchemy (async) + Alembic
  frontend/    # React + Vite + TailwindCSS
```

> This project uses a **local PostgreSQL** install (no Docker). The database
> `asset` and the `postgres` user are expected to already exist locally.
>
> Note: PostgreSQL folds unquoted identifiers to lowercase, so the database
> created from `ASSET` is actually named `asset`. The connection string uses
> `asset` to match.

## Prerequisites

- Python 3.11+ (3.11 / 3.12 recommended for the ML dependencies)
- Node.js 18+
- PostgreSQL 15+ running locally on port 5432, with database **`asset`**

## Backend setup

```powershell
cd backend

# create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# install dependencies
pip install -r requirements.txt

# configuration: backend/.env already points at the local ASSET database.
# (Postgres password is URL-encoded there: '#' -> '%23')

# create the database tables via Alembic
alembic revision --autogenerate -m "create users table"
alembic upgrade head

# run the API
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

Key endpoints:

| Method | Path                  | Description                  |
| ------ | --------------------- | ---------------------------- |
| GET    | `/api/v1/health`      | Service health              |
| GET    | `/api/v1/health/db`   | Database connectivity check |
| POST   | `/api/v1/auth/register` | Create a user              |
| POST   | `/api/v1/auth/login`  | Get a JWT access token      |
| GET    | `/api/v1/auth/me`     | Current user (requires token) |

### Background tasks (optional)

Celery + Redis are included. With a local Redis running:

```powershell
celery -A app.celery_app.celery worker --loglevel=info --pool=solo
```

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:3000 (the dev server proxies `/api` to the backend on
port 8000).

## Notes

- TailwindCSS v4 is configured via the official `@tailwindcss/vite` plugin —
  there is no `tailwind.config.js`; global styles live in `src/index.css`.
- The Alembic environment is async (asyncpg) and reads the database URL from
  `backend/.env`, so you don't set `sqlalchemy.url` in `alembic.ini`.
