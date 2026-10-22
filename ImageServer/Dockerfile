# GPU image for Cloud Run. Weights are not in the image by default; they come
# from a Cloud Storage volume mounted at /weights (see README). Build with
# --build-arg BAKE_MODEL=1 to put them in the image instead, at the cost of a
# 15-50 GB image and a slower first pull on every new revision.

FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/weights/hf \
    HF_HUB_OFFLINE=1 \
    PORT=8080

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3.11 python3.11-venv python3-pip git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3.11 -m venv /venv
ENV PATH=/venv/bin:$PATH

# torch first, from the CUDA 12.4 wheel index, so pip does not pull the CPU
# build that PyPI serves by default.
RUN pip install --upgrade pip \
  && pip install torch --index-url https://download.pytorch.org/whl/cu124

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY *.py ./

ARG BAKE_MODEL=0
ARG MODEL_ID=Tongyi-MAI/Z-Image-Turbo
# HF_TOKEN is only needed for gated repositories. Pass it as a secret
# (`docker build --secret id=HF_TOKEN`), never as a build arg.
RUN if [ "$BAKE_MODEL" = "1" ]; then \
      HF_HUB_OFFLINE=0 MODEL_ID="$MODEL_ID" \
      HF_TOKEN="$(cat /run/secrets/HF_TOKEN 2>/dev/null || true)" \
      python download.py; \
    fi

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1 --timeout-keep-alive 75"]
