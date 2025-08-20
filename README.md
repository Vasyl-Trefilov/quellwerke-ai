# Qdrant + LoRA Microservices Chatbot

🚀 A portfolio project demonstrating **AI microservices** architecture with:
- **Node.js** service to connect Postgres + Qdrant (vector DB).
- **Python (FastAPI)** LoRA inference server with GPU support.
- **Qdrant** as the vector database (via Docker).

This setup shows how to build a modular AI system that combines:
- Retrieval-Augmented Generation (RAG)
- Lightweight LoRA model hosting
- Multi-service communication with Docker Compose

---

## 🛠️ Architecture
```bash
+-------------+ +------------+ +-------------+
| Frontend | ---> | nodeQdrant | ---> | Postgres |
| (chatbot) | | (API) | | + Qdrant |
+-------------+ +------------+ +-------------+
|
v
+----------+
| LoRA |
| Inference|
+----------+
```

---

## 📦 Tech Stack

- **Frontend**: React (chat UI)
- **Backend #1**: Node.js (API for Qdrant + Postgres)
- **Backend #2**: Python (FastAPI + LoRA inference)
- **Vector DB**: Qdrant
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **GPU Support**: NVIDIA Docker Runtime

---

## 🚀 Run Locally

### 1. Clone the repo
```bash
git clone git@github.com:Vasyl-Trefilov/qdrant-lora-microservices.git
cd qdrant-lora-microservices
git submodule update --init --recursive
```