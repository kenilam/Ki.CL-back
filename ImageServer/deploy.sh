#!/usr/bin/env sh
# Build the image with Cloud Build and deploy it to Cloud Run with one L4.
#
# Required:  PROJECT_ID  WEIGHTS_BUCKET
# Optional:  REGION (europe-west1)  SERVICE (image-server)  MODEL_ID  QUANTIZE
#            IMAGE_SERVER_TOKEN  MIN_INSTANCES (0)  BACKEND_SA (grants run.invoker)
#
# Cloud Run GPU is available in a handful of regions; europe-west1, europe-west4,
# us-central1, us-east4 and asia-southeast1 all have L4 at the time of writing.
set -eu

: "${PROJECT_ID:?set PROJECT_ID}"
: "${WEIGHTS_BUCKET:?set WEIGHTS_BUCKET (bucket holding the HF cache)}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-image-server}"
MODEL_ID="${MODEL_ID:-Tongyi-MAI/Z-Image-Turbo}"
QUANTIZE="${QUANTIZE:-none}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE}/${SERVICE}:$(git rev-parse --short HEAD 2>/dev/null || date +%s)"

gcloud config set project "$PROJECT_ID" >/dev/null

# One-time: the registry and the weights bucket.
gcloud artifacts repositories describe "$SERVICE" --location "$REGION" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "$SERVICE" --repository-format docker --location "$REGION"
gcloud storage buckets describe "gs://${WEIGHTS_BUCKET}" >/dev/null 2>&1 \
  || gcloud storage buckets create "gs://${WEIGHTS_BUCKET}" --location "$REGION" --uniform-bucket-level-access

gcloud builds submit --tag "$IMAGE" .

ENV_VARS="MODEL_ID=${MODEL_ID},QUANTIZE=${QUANTIZE}"
if [ -n "${IMAGE_SERVER_TOKEN:-}" ]; then
  ENV_VARS="${ENV_VARS},IMAGE_SERVER_TOKEN=${IMAGE_SERVER_TOKEN}"
fi

# concurrency 1: one drawing holds the whole GPU. timeout 600 covers a cold
# start plus a 50-step Qwen-Image render on an L4. The startup probe keeps
# traffic away until /ready answers, so a request that arrives during a cold
# start waits rather than failing.
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --gpu 1 --gpu-type nvidia-l4 --no-gpu-zonal-redundancy \
  --cpu 8 --memory 32Gi \
  --concurrency 1 \
  --min-instances "$MIN_INSTANCES" --max-instances 1 \
  --timeout 600 \
  --no-cpu-throttling \
  --no-allow-unauthenticated \
  --set-env-vars "$ENV_VARS" \
  --add-volume "name=weights,type=cloud-storage,bucket=${WEIGHTS_BUCKET},readonly=true" \
  --add-volume-mount "volume=weights,mount-path=/weights" \
  --startup-probe "httpGet.path=/ready,initialDelaySeconds=20,periodSeconds=10,failureThreshold=60,timeoutSeconds=5"

if [ -n "${BACKEND_SA:-}" ]; then
  gcloud run services add-iam-policy-binding "$SERVICE" \
    --region "$REGION" \
    --member "serviceAccount:${BACKEND_SA}" \
    --role roles/run.invoker
fi

gcloud run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)'
