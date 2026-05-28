# TestGen AI v7 — Cloud Deployment Guide

## Architecture (all FREE, no local servers needed)
- LLM: Groq API (free, 10x faster than Ollama)
- Database: MongoDB Atlas (free cloud)
- Backend: FastAPI on Render.com (free)
- Frontend: React on Vercel (free)

## Step 1 — Get free API keys

### Groq (Free LLM API)
1. Sign up at https://console.groq.com
2. API Keys → Create API Key → copy gsk_xxxxx

### MongoDB Atlas (Free Cloud DB)
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster → Add DB user → Allow all IPs (0.0.0.0/0)
3. Connect → Drivers → copy connection string (replace <password>)

## Step 2 — Deploy Backend to Render.com
1. Push project to GitHub
2. Render.com → New → Web Service → Connect GitHub
3. Root Dir: backend | Build: pip install -r requirements.txt | Start: uvicorn main:app --host 0.0.0.0 --port $PORT
4. Add env vars: MONGO_URI, GROQ_API_KEY, GROQ_MODEL=llama-3.3-70b-versatile
5. Deploy → copy URL (e.g. https://testgen-ai-backend.onrender.com)

## Step 3 — Deploy Frontend to Vercel
1. Vercel.com → New Project → Import GitHub repo
2. Root Dir: frontend | Framework: Vite
3. Add env var: VITE_API_URL=https://testgen-ai-backend.onrender.com
4. Deploy → your app is live!

## Local development
cd backend && pip install -r requirements.txt
set MONGO_URI=mongodb+srv://... && set GROQ_API_KEY=gsk_...
uvicorn main:app --reload --port 8000

cd frontend && npm install && npm run dev

## Default logins
admin@testgen.com (admin) | user@testgen.com (user)
