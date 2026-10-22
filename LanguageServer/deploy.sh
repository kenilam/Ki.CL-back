#!/usr/bin/env sh
# Deploy vLLM's own image to Cloud Run with one L4, serving one vision-language
# model over the OpenAI-compatible API the backend's self-hosted text and
# vision providers speak.
#
# Required:  PROJECT_ID  WEIGHTS_BUCKET
# Optional:  REGION (europe-west1)  SERVICE (language-server)
#            MODEL_ID (Qwen/Qwen3-VL-8B-Instruct)  MAX_MODEL_LEN (8192)
#            VLLM_VERSION (latest)  LLM_SERVER_TOKEN  MIN_INSTANCES (0)
#            BACKEND_SA (grants run.invoker)
set -eu

: "${PROJECT_ID:?set PROJECT_ID}"
: "${WEIGHTS_BUCKET:?set WEIGHTS_BUCKET (bucket holding the HF cache)}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-language-server}"
MODEL_ID="${MODEL_ID:-Qwen/Qwen3-VL-8B-Instruct}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"
VLLM_VERSION="${VLLM_VERSION:-latest}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"

gcloud config set project "$PROJECT_ID" >/dev/null

# Cloud Run pulls from Artifact Registry, not Docker Hub. A remote repository
# caches Docker Hub images under our own project so nothing is rebuilt.
gcloud artifacts repositories describe dockerhub --location "$REGION" >/dev/null 2>&1 \
  || gcloud artifacts repositories create dockerhub \
       --repository-format docker --location "$REGION" \
       --mode remote-repository --remote-docker-repo DOCKER-HUB
gcloud storage buckets describe "gs://${WEIGHTS_BUCKET}" >/dev/null 2>&1 \
  || gcloud storage buckets create "gs://${WEIGHTS_BUCKET}" --location "$REGION" --uniform-bucket-level-access

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/dockerhub/vllm/vllm-openai:${VLLM_VERSION}"

ARGS="--model=${MODEL_ID},--port=8080,--host=0.0.0.0,--max-model-len=${MAX_MODEL_LEN}"
ARGS="${ARGS},--gpu-memory-utilization=0.90,--limit-mm-per-prompt=image=1,--max-num-seqs=8"
if [ -n "${LLM_SERVER_TOKEN:-}" ]; then
  ARGS="${ARGS},--api-key=${LLM_SERVER_TOKEN}"
fi

# The startup probe keeps traffic away until the model is on the GPU, so a
# request that arrives during a cold start waits rather than failing. The
# backend's LLM_SERVER_TIMEOUT_MS is what bounds that wait.
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --gpu 1 --gpu-type nvidia-l4 --no-gpu-zonal-redundancy \
  --cpu 8 --memory 32Gi \
  --concurrency 8 \
  --min-instances "$MIN_INSTANCES" --max-instances 1 \
  --timeout 600 \
  --no-cpu-throttling \
  --no-allow-unauthenticated \
  --set-env-vars "HF_HOME=/weights/hf,HF_HUB_OFFLINE=1,VLLM_LOGGING_LEVEL=INFO" \
  --add-volume "name=weights,type=cloud-storage,bucket=${WEIGHTS_BUCKET},readonly=true" \
  --add-volume-mount "volume=weights,mount-path=/weights" \
  --startup-probe "httpGet.path=/health,initialDelaySeconds=30,periodSeconds=10,failureThreshold=60,timeoutSeconds=5" \
  --args "$ARGS"

if [ -n "${BACKEND_SA:-}" ]; then
  gcloud run services add-iam-policy-binding "$SERVICE" \
    --region "$REGION" \
    --member "serviceAccount:${BACKEND_SA}" \
    --role roles/run.invoker
fi

gcloud run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)'
