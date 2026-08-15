# PatchWork

PatchWork is a resume improvement platform built with React, FastAPI, and Supabase.

## Prerequisites

Install:

- Git
- Node.js 24+
- npm 11+
- Python 3.13+
- VS Code recommended

Check installation:

```powershell
git --version
node --version
npm --version
python --version
```

## Clone the Repository

```
git clone https://github.com/Ericka-7james/patchwork.git
cd patchwork
```

## Create a Feature Branch
Do not work directly on `main`.

```
git switch -c feature/your-feature-name
```

Example:

```
git switch -c feature/resume-upload
```

## Frontend Setup

```
cd frontend
npm install
Copy-Item .env.example .env
```

Add the required development values to `frontend/.env`.
Start the frontend:

```
npm run dev
```

Frontend:

```
http://localhost:5173
```

## Backend Setup
Open a second terminal:

```
cd C:\dev\Projects\patchwork\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If needed:

```
Copy-Item .env.example .env
```

Run backend tests:
```
pytest
```

Start the backend:
```
uvicorn app:app --reload
```

Backend:

```
http://127.0.0.1:8000
```

FastAPI docs:

```
http://127.0.0.1:8000/docs
```

## Start the Project Later
Frontend:

```
cd frontend
npm run dev
```

Backend:

```
cd C:\dev\Projects\patchwork\backend
.\.venv\Scripts\Activate.ps1
uvicorn app:app --reload
```

## Fix Formatting or Lint Errors Before Commit/Push

If Git blocks a commit or push because Prettier or ESLint checks fail, run the frontend checks manually first:

```powershell
cd frontend
npm run check
```

If Prettier reports formatting issues, automatically fix them with:

```powershell
npx prettier --write .
```

Then run the checks again:

```powershell
npm run check
```

If ESLint reports issues that can be fixed automatically, run:

```powershell
npm run lint -- --fix
```

Then verify everything passes:

```powershell
npm run check
```

After the checks pass, return to the project root and retry the commit or push:

```powershell
cd ..
git add .
git commit -m "your commit message"
git push
```

Do not bypass Husky checks unless absolutely necessary. Fix the formatting, lint, test, or build issue instead.

### Good Day :)