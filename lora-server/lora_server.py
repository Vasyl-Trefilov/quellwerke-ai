from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json, threading, asyncio
from transformers import TextIteratorStreamer
from unsloth import FastLanguageModel
import uvicorn
from typing import Any

# ===========================
# Load model once on startup
# ===========================
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="./llama3.2-3b",   # path to model (3B parameters)
    max_seq_length=1024,          # maximum context length (input+output tokens)
    dtype=None,                   # auto-detect precision
    load_in_4bit=True,            # quantization (saves VRAM, slower a bit)
    device_map="auto",            # auto-place layers across GPUs/CPU
)

# Load your fine-tuned LoRA adapter
model.load_adapter("llama3.2-3b-quellwerke-lora-final")

# ===========================
# FastAPI app setup
# ===========================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # allow all origins
    allow_credentials=True,
    allow_methods=["*"],      # allow all methods
    allow_headers=["*"],      # allow all headers
)

class Query(BaseModel):
    question: str
    settings: dict[str, Any] 

# ===========================
# Streaming token generator
# ===========================
async def ndjson_token_stream(question: str, settings: dict[str, Any], request: Request):
    # Encode input into tokens
    inputs = tokenizer(question, return_tensors="pt").to(model.device)

    # Streamer yields tokens as they are generated
    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,         # don't repeat the input prompt
        skip_special_tokens=True  # filter things like <s>, </s>, <pad>
    )

    # Default generation config
    default_gen_kwargs = dict(

        # === LENGTH CONTROL ===
        max_new_tokens=300,        # maximum tokens the model will generate
                                  # (increase if you get mid-sentence cutoffs,
                                  # decrease if it's "rambling too much")

        # === SAMPLING SETTINGS ===
        do_sample=True,           # enable sampling (otherwise always greedy)
        temperature=0.7,          # randomness (lower = more deterministic)
        top_p=0.9,                # nucleus sampling: only keep top p=90% probs
        top_k=50,                 # (optional) sample only from top-k tokens

        # === REPETITION CONTROL ===
        repetition_penalty=1.2,   # >1.0 discourages repeating same phrases

        # === STOPPING ===
        eos_token_id=tokenizer.eos_token_id, # stop if model outputs <eos>
        pad_token_id=tokenizer.eos_token_id, # filler token (same here)

        # === STREAMING ===
        streamer=streamer,
    )

    # Merge defaults with user settings (override if provided)
    gen_kwargs = {**default_gen_kwargs, **settings}

    # Run generation in background thread
    t = threading.Thread(target=model.generate, kwargs={**inputs, **gen_kwargs})
    t.start()

    try:
        for new_text in streamer:
            if await request.is_disconnected():
                break
            if new_text:
                # Send tokens to client immediately in NDJSON format
                yield (json.dumps({"delta": new_text}) + "\n").encode("utf-8")
                await asyncio.sleep(0)  # let event loop flush
    finally:
        yield b'{"done": true}\n'

# ===========================
# API endpoint
# ===========================

@app.post("/generate")
async def generate(q: Query, request: Request):
    return StreamingResponse(
        ndjson_token_stream(q.question, q.settings, request),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
