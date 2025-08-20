# file: lora_server.py
from fastapi import FastAPI, Request
from pydantic import BaseModel
import uvicorn
import torch
from unsloth import FastLanguageModel
from fastapi.middleware.cors import CORSMiddleware

# Load LoRA model once
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="./llama3.2-3b",
    max_seq_length=1024,
    dtype=None,
    load_in_4bit=True,
    device_map="auto",
)
model.load_adapter("llama3.2-3b-quellwerke-lora-final")



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or restrict to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Query(BaseModel):
    question: str

@app.post("/generate")
def generate(q: Query):
    inputs = tokenizer(q.question, return_tensors="pt").to("cuda")
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=300,
            do_sample=True,
            top_p=0.9,
            temperature=0.7,
            repetition_penalty=1.2,
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.eos_token_id,
        )
    answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"answer": answer}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
