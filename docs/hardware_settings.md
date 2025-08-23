# Hosting & LoRA Model Settings

This guide provides recommended hardware and configuration settings for running LoRA models of various sizes.  
Sections are split into **Learning** (for experimenting and small-scale usage) and **Hosting** (for production deployments).

---

## Learning (Experimenting on Your Laptop/Desktop)

| Model Size | Minimum GPU VRAM | Recommended GPU VRAM | RAM      | Notes                                                                                                                                                                         |
| ---------- | ---------------- | -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1B         | 2 GB             | 4 GB                 | 8 GB     | Can run on most laptops. Small batch size (1–2). Mixed precision optional.                                                                                                    |
| 2B         | 3 GB             | 6–8 GB               | 16 GB    | Inference works fine. Training requires GPU + more RAM.                                                                                                                       |
| 3B         | 4 GB             | 8–12 GB              | 16–24 GB | Good for local inference on mid-range laptops/workstations. Training recommended on desktop or cloud GPU. GPU example RTX3050 ti (4VRAM) min and RTX3060 (12GB VRAM) perfect. |
| 7B         | 12 GB            | 16–24 GB             | 32 GB+   | Best run on powerful workstation or cloud. Local laptop inference possible with reduced sequence length.                                                                      |

### Suggested LoRA Settings for Learning

| Model Size | Batch Size | Max Sequence Length | Precision | Notes                                                  |
| ---------- | ---------- | ------------------- | --------- | ------------------------------------------------------ |
| 1B         | 1–4        | 512                 | fp16/bf16 | Small VRAM usage, fast inference.                      |
| 2B         | 1–2        | 512                 | fp16/bf16 | May need to lower batch size for laptops.              |
| 3B         | 1          | 512                 | fp16      | GPU memory critical. Mixed precision recommended.      |
| 7B         | 1          | 512                 | bf16/fp16 | Requires high-end GPU or cloud. Slow on local laptops. |

> ⚠️ Low-end laptops (<8 GB RAM, no GPU) should stick to GPT+RAG via OpenAI API. LoRA inference is not recommended.

---

## Hosting (Production / Stable Deployment)

| Model Size | GPU VRAM | RAM      | Recommended Setup            | Notes                                                                                   |
| ---------- | -------- | -------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| 1B         | 2-3 GB   | 8–16 GB  | Local laptop or small server | Full Docker Compose stack possible.                                                     |
| 2B         | 4–6 GB   | 16 GB    | Mid-range workstation        | LoRA inference stable. Training possible with cloud GPU.                                |
| 3B         | 6-10 GB  | 16–24 GB | High-end desktop             | Can host all microservices + inference locally. Small-scale training possible.          |
| 7B         | 16–24 GB | 32 GB+   | Cloud GPU recommended        | Best for production deployment. Local inference feasible with reduced batch/seq length. |

### Hosting Recommendations

- Always monitor **GPU/CPU temperature** and **RAM usage**.
- Adjust **batch size, sequence length, and precision** according to available hardware.
- For public deployment, use **Docker + microservices** to isolate Node.js, FastAPI, and Rust services.
- Cloud GPUs (A100/H100) are recommended for large models (3B–7B) and for scaling production workloads.

---

### Important Tips for Learning / Fine-tuning

- ⚠️ **Always be careful with your hardware.**
- Recommended settings for local fine-tuning on laptops or mid-range PCs:
  - `learning_rate = 1e-4`
  - `max_seq_length = 512`

> DO NOT try to max out batch size or sequence length—overworking your CPU/GPU for 30 minutes can damage your laptop.  
> It’s much better to give more time on lower settings than risk overheating or crashing your machine.  
> Patience > brute force 🔥💻

### Linux + NVIDIA GPU Safety Tips

If you are using **Linux** with an NVIDIA GPU, you can monitor and limit GPU usage to prevent overheating or damage during learning/fine-tuning:

1. **Check GPU power readings**:

```bash
nvidia-smi -q
```

Look for the section GPU Power Readings, e.g.:

```mathematica
 GPU Power Readings
        Average Power Draw                : 6.40 W
        Instantaneous Power Draw          : 6.42 W
        Current Power Limit               : 60.00 W
        Requested Power Limit             : 60.00 W
        Default Power Limit               : 60.00 W
        Min Power Limit                   : 1.00 W
        Max Power Limit                   : 75.00 W
```

Lower the maximum GPU power to save your card:

```bash
sudo nvidia-smi -i 0 -pl 40   # sets max power to 40W (just 20-30W lower)
```

Slow down GPU clocks (optional, extra safety for old hardware):

```bash
nvidia-smi -q
```

Look for the section `Max Clocks`, e.g.:

```mathematica
Slow down GPU clocks (optional, extra safety for old hardware):
    Max Clocks
        Graphics                          : 2100 MHz
        SM                                : 2100 MHz
        Memory                            : 6001 MHz
        Video                             : 1950 MHz
```

sudo nvidia-smi -i 0 -ac 4500,1500 # sets memory clock and GPU clock lower

> ⚠️ Using these commands ensures your GPU doesn’t overheat or consume too much >power while fine-tuning or running inference. Always monitor temperatures and >adjust limits according to your system.
