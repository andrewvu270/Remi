# Remi
**Your Intelligent Study Monster**

Remi is an AI-powered productivity assistant that optimizes your academic life. It uses multi-agent AI to extract tasks from syllabi, predict detailed workload metrics, and generate balanced schedules that prevent burnout.

## Key Features
- **Syllabus Extraction**: Upload PDFs or images to auto-extract assignments and exams using **PaddleOCR** and **ERNIE**.
- **Workload Prediction**: Hybrid LLM and ML **ERNIE + PaddlePaddle (Groq/OpenAI + LightGBM fallback)** models predict time effort and stress scores.
- **Smart Scheduling**: Automatically balances your week based on predicted workload.
- **Study Habit Analysis**: Tracks completion times and focus duration to optimize your personal "Energy Profile".
- **Stress Analytics**: Predicts burnout risk by analyzing deadline density and study habit patterns.
- **Pomodoro Focus**: Built-in timer with Remi's mood tracking—keep him happy by staying focused!
- **Natural Language Chat**: Ask Remi "What's due this week?" or "Plan my study time".
- **Guest & Cloud Modes**: Start instantly without an account (local storage) or sync across devices.

## Tech Stack
**Frontend** (Deployed on Cloudflare)
- **React + Vite + TypeScript**
- **Material UI** (Custom Premium Theme)
- **Framer Motion** & **Tremor** (Analytics)

**Backend** (Deployed on Google Cloud Run)
- **FastAPI** (Python 3.11)
- **Supabase** (PostgreSQL)
- **AI Core**:
  - **Orchestrator**: Multi-agent workflow management
  - **LLM**: **ERNIE** primary, **Groq** (Llama 3.3) secondary, **OpenAI** (GPT-4) fallback
  - **OCR/NLU**: **PaddleOCR** for layout, **ERNIE** for parsing
  - **ML**: Fine-tuned  **ERNIE** for calibrated workload predictions (Trained **LightGBM** for fallback)