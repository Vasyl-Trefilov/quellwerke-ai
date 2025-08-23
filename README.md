# Qdrant + LoRA + Axum Microservices Chatbot

A portfolio project showing **three approaches combined into one chatbot system**:

1. **LoRA (3B params) fine-tuned model** served via FastAPI with GPU acceleration.
2. **GPT (OpenAI API) + Retrieval-Augmented Generation (RAG)** using Qdrant + Postgres.
3. **Rust (Axum) crawler microservice** for fast and efficient content ingestion into Postgres + Qdrant.

The goal: **compare a lightweight, specialized LoRA model** vs. **a general-purpose GPT with vector search**, while also **showcasing a high-performance Rust-based ingestion pipeline**.

---

## Architecture

```bash
                                                            Separately (no DB dependency):
                        +------------------+----------------+------------------+
                        |  Frontend (UI)   |                |  LoRA Server     |
                        |     React        |                |  (FastAPI GPU)   |
                        +---------+--------+                |  /generate       |
                                  |                         +------------------+
                                  | direct HTTP calls
                     +------------+------------+
                     |                         |
             +-------+-------+         +-------+-------+
             |   nodeQdrant  |         |   Axum Parser |
             | (API, RAG,    |         | (Rust, /parse-url)
             |  OpenAI calls)|         +-------+-------+
             +-------+-------+                 |
                     |                         |
                     |                         v
                     |                 +---------------+
                     |                 | Postgres      |
                     |                 | Qdrant        |
                     |                 +---------------+
                     |                         ^
                     |                         |
                     v                         |
+--------------------+-------------------------+
|   OpenAI API (used by nodeQdrant for RAG)    |
+----------------------------------------------+

```

![System Architecture](./docs/architecture.svg)

---

## Tech Stack

- **Frontend**: React (chat UI)
- **Backend #1**: Node.js (API for Qdrant + Postgres + OpenAI API)
- **Backend #2**: Python (FastAPI + LoRA inference)
- **Backend #3**: Rust (Axum + reqwest + sqlx + qdrant-client for crawling & ingestion)
- **Vector DB**: Qdrant
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **GPU Support**: NVIDIA Docker Runtime

---

## API Endpoints

- `POST /parse-url` handled by **Axum server**
  - Crawls a website
  - Splits content into chunks
  - Stores chunks in **Postgres + Qdrant**
- `POST /search` **GPT + RAG response**
- `POST /generate` **LoRA inference response**

---

## Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/Vasyl-Trefilov/quellwerke-ai.git
cd quellwerke-ai
```

### 2. Start frontend

```bash
cd chatbot-front
npm install
npm run dev
```

### 3. Start backend services

```bash
docker compose up --build
```

---

## Environment Variables

Both Node.js and Axum services require Postgres + Qdrant connection details.  
These are set inside `docker-compose.yml`:

- `DATABASE_URL=postgres://myuser:mypassword@postgres:5432/mydb`
- `QDRANT_URL=http://qdrant:6333`
- `OPENAI_API_KEY=sk-xxxx`

---

## Why this project?

- Show how a **small fine-tuned model (LoRA 3B)** can match or even outperform GPT on a _narrow domain_.
- Compare it against **GPT + RAG**, which leverages vector search and a general-purpose model.
- Introduce **Rust (Axum) microservice** to demonstrate **performance gains in ingestion pipelines**.
- Highlight **trade-offs**: cost, latency, accuracy, deployment complexity.

---

## Comparison

| Feature            | LoRA (3B) Fine-tuned  | GPT + RAG                | Axum Crawler         |
| ------------------ | --------------------- | ------------------------ | -------------------- |
| Accuracy (domain)  | ✅ High if fine-tuned | ✅ High (with good data) | n/a (data ingestion) |
| Accuracy (general) | ❌ Weak               | ✅ Very strong           | n/a                  |
| Latency            | ⚡ Fast (local GPU)   | 🌍 Depends on API        | ⚡ Very fast (Rust)  |
| Cost               | 💰 One-time (GPU)     | 💵 Ongoing (API usage)   | 🆓 One-time          |
| Deployment         | Requires GPU server   | Works anywhere with API  | Lightweight binary   |

---

## Demo

Frontend provides a simple **chat UI** where you can:

- Ask a question and get a response from **LoRA model**
- Switch to **GPT+RAG mode** and compare answers side by side
- Ingest new websites instantly with the **Rust Axum crawler**

---

## License

MIT License. Free to use, modify, and share.
