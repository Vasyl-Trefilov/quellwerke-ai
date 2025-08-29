FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Set working directory
WORKDIR /app

# Install system deps (add build tools and python dev headers)
RUN apt-get update && apt-get install -y \
    python3 python3-venv python3-pip python3-dev \
    build-essential git curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip/setuptools/wheel to latest
RUN python3 -m pip install --upgrade pip setuptools wheel

# Copy requirements first for better caching
COPY requirements.txt .

# Install requirements (try PyPI first, fall back to mirror if needed)
RUN pip install --no-cache-dir -r requirements.txt \
    --timeout=100 \
    --retries=5 \
    -i https://pypi.org/simple

# Copy LoRA code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI server
CMD ["uvicorn", "lora_server:app", "--host", "0.0.0.0", "--port", "8000"]
