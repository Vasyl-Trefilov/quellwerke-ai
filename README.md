# Qdrant + LoRA + Axum Microservices Chatbot

> Production-ready portfolio project combining **GPT + RAG**, a **fine‑tuned LoRA model**, and a **high‑performance Rust crawler**—all wired together with Dockerized microservices.

[![Dockerized](https://img.shields.io/badge/Container-Docker-informational)]()
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green)]()
[![FastAPI](https://img.shields.io/badge/Model%20API-FastAPI-blue)]()
[![Rust](https://img.shields.io/badge/Crawler-Rust-orange)]()
[![Qdrant](https://img.shields.io/badge/VectorDB-Qdrant-purple)]()
[![Postgres](https://img.shields.io/badge/DB-PostgreSQL-316192)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## TL;DR

- **Two answering modes:**
  1. **GPT + RAG** (Node.js → embeddings → Qdrant → Postgres context → OpenAI)
  2. **LoRA (3B)** fine‑tuned model (FastAPI on GPU)
- **Rust Axum Crawler** ingests any website → splits → stores raw text in **Postgres** + vectors in **Qdrant**.
- **Frontend (React/Vercel)** lets you **toggle models**, **tune AI settings** (temperature, max tokens, top‑p, etc.), and **compare answers side‑by‑side**.
- **Costs tracked** for OpenAI calls (request/response token usage).
- Everything ships in **Docker**.

---

## System Architecture (Mermaid)

![System Architecture](./docs/architecture.svg)

---

## How It Works

1. **Frontend (React on Vercel)**

   - Sends **question + AI settings** in the request body.
   - You can switch between **GPT+RAG** and **LoRA** modes.
   - Also triggers **crawl requests** to ingest new sites.

2. **Node.js API (RAG orchestrator)**

   - Creates an **embedding** for the query.
   - Searches **Qdrant** for nearest vectors.
   - Fetches the associated **chunks** from **Postgres**.
   - Combines chunks as **context** and calls **OpenAI** with user settings.
   - Returns **answer + usage/cost** back to the frontend.

3. **FastAPI LoRA Server (Inference)**

   - Hosts a **fine‑tuned 3B LoRA** model (served locally, GPU‑accelerated).
   - Low‑latency answers for **narrow domain** questions.

4. **Rust Axum Crawler (Ingestion)**
   - Fetches & parses pages → splits into **chunks**.
   - Stores **raw text** in **Postgres** and **vectors** in **Qdrant**.
   - Designed for **high throughput** and low memory overhead.

---

## Tech Stack

- **Frontend**: React (chat UI, Vercel)
- **Backend #1**: Node.js (API for Qdrant + Postgres + OpenAI API)
- **Backend #2**: Python (FastAPI + LoRA inference)
- **Backend #3**: Rust (Axum + reqwest + sqlx + qdrant-client for crawling & ingestion)
- **Vector DB**: Qdrant
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **GPU Support**: NVIDIA Docker Runtime (for LoRA inference/training)

---

## API Overview

### `POST /parse-url` (Axum, Rust)

**Body:**

```json
{
  "url": "https://example.com/some-page"
}
```

**What it does:** crawls, cleans, chunks → inserts **Postgres rows** + **Qdrant vectors**.

---

### `POST /search` (Node.js → GPT + RAG)

**Body:**

```json
{
  "query": "What is QuellWerke's core service?",
  "settings": {
    "answer_length": "long"
  }
}
```

**Flow:** embed → Qdrant search → fetch Postgres chunks → call OpenAI with context.  
**Returns:** answer, used chunks, token usage, cost estimate.

---

### `POST /generate` (FastAPI → LoRA)

**Body:**

```json
{
  "prompt": "Summarize QuellWerke's services.",
  "settings": {
    "max_new_tokens": 600,
    "temperature": 0.7,
    "top_p": 0.9,
    "top_k": 50,
    "repetition_penalty": 1.2
  }
}
```

**Returns:** model answer + timing.

> The exact payload shape can be adapted; the idea is **settings are always passed by the frontend** to both pipelines.

---

## Run Locally

### 1) Clone

```bash
git clone https://github.com/Vasyl-Trefilov/quellwerke-ai.git
cd quellwerke-ai
```

### 2) Frontend (dev)

```bash
cd chatbot-front
npm install
npm run dev
```

### 3) Services (Docker)

```bash
docker compose up --build
```

All microservices (Node, FastAPI, Axum, Postgres, Qdrant) will start together.

---

## Environment Variables

These are typically provided via `docker-compose.yml` or `.env` files.

**Common**

- `DATABASE_URL=postgres://myuser:mypassword@postgres:5432/mydb`
- `QDRANT_URL=http://qdrant:6333`
- `OLLAMA_URL=http://localhost:11434`

**Node.js (RAG)**

- `OPENAI_API_KEY=sk-...`

> Check `docker-compose.yml` for the authoritative values/overrides.

---

## Hardware Guidance (from a student building on a laptop)

- **CPU:** modern 4+ cores recommended (older CPUs will struggle)
- **RAM:** 16 GB minimum (8 GB can work but you’ll feel pain)
- **GPU:** NVIDIA 4–8 GB VRAM recommended for LoRA inference; for training, more is better
- **Storage:** 10–20 GB free (Docker images, datasets, Qdrant, Postgres)

⚠️ **Warning:** Training/fine‑tuning on an old laptop will cook it. If the fans start screaming—pause and consider cloud GPUs.

---

## Hosting & Model Settings

I also provide **recommended hosting and LoRA settings for different PCs** depending on GPU, RAM, and model size.  
For example, which GPU works best for 1B, 2B, 3B, or 7B models, and how to adjust batch size, sequence length, and precision.

> Check the dedicated table / guide in `docs/hardware_settings.md` (or add it later) for detailed recommendations.

---

## Cost Controls (OpenAI)

- The Node service records **prompt/completion tokens** and **per‑request cost**.
- You can cap `max_tokens`, enforce `temperature`, and set a **global monthly ceiling** (env var).
- Add simple rate limiting if you expose the API publicly.

---

## Monitoring & Observability (optional but recommended)

- **Logs:** structured JSON logs for each service (request id, latency, errors).
- **Metrics:** Prometheus + Grafana dashboard (RPS, p95 latency, token usage).
- **Tracing:** OpenTelemetry (trace a request from frontend → RAG → OpenAI).

---

## Comparison (at a glance)

| Feature            | LoRA (3B) Fine‑tuned  | GPT + RAG                 | Axum Crawler        |
| ------------------ | --------------------- | ------------------------- | ------------------- |
| Accuracy (domain)  | ✅ High if fine‑tuned | ✅ High (if data is good) | n/a (ingestion)     |
| Accuracy (general) | ❌ Limited            | ✅ Very strong            | n/a                 |
| Latency            | ⚡ Very fast (local)  | 🌍 Depends on API         | ⚡ Very fast (Rust) |
| Cost               | 💰 One‑time (GPU)     | 💵 Ongoing (API usage)    | 🆓 One‑time         |
| Deployment         | Needs GPU             | Anywhere (API)            | Lightweight binary  |

---

## License

MIT — free to use, modify, and share.

---

## Author / Notes

Built by a **16‑year‑old student** as a real‑world exploration of MLOps: crawling, data pipelines, vector search, fine‑tuning, GPU inference, and full‑stack integration.  
If you’re a student too: start with **GPT + RAG** and only move to **LoRA** if you need lower latency or offline capability.
