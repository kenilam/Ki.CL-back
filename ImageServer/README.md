# Image server

A self-hosted text-to-image endpoint for the Ki.CL backend. It loads one
open-weight model with Hugging Face `diffusers` and serves it over HTTP on a
Cloud Run GPU service. The backend talks to it through the `self-hosted`
provider in `Server/Modules/TaxonVisual/providers/image/`, which sits in the
same failover chain as OpenAI, Cloudflare and Pollinations.

This folder is self-contained (its own Dockerfile, dependencies and deploy
script) so it can move to its own repository unchanged.

## API

| Route | What |
|---|---|
| `POST /generate` | JSON in, `image/png` out. Fields: `prompt`, `negative_prompt`, `width`, `height`, `steps`, `seed`, `guidance`, `true_cfg`. Everything but `prompt` has a default. |
| `GET /ready` | 200 once the model is on the GPU, 503 before. Cloud Run's startup probe. |
| `GET /healthz` | 200 while the process is up. |

The response carries `X-Generator: <MODEL_ID>`, which the backend stores as the
asset's generator.

If `IMAGE_SERVER_TOKEN` is set the route requires `Authorization: Bearer <token>`.
On Cloud Run the service is deployed without unauthenticated access, so the
backend's service account needs `roles/run.invoker` and sends an ID token; the
bearer token is for running it somewhere without IAM.

## Models

Set `MODEL_ID`. Defaults for steps and guidance come from `settings.py` per
model family and can be overridden with `DEFAULT_STEPS`, `DEFAULT_GUIDANCE`
and `DEFAULT_TRUE_CFG`.

| Model | Licence | Fits an L4 (24 GB) | Time per 1024² on an L4 | Notes |
|---|---|---|---|---|
| `Tongyi-MAI/Z-Image-Turbo` (default) | Apache 2.0 | yes, bf16 | a few seconds, 8 steps | Above Flux Schnell in quality, fast enough for cold starts. |
| `Qwen/Qwen-Image-2512` | Apache 2.0 | with `QUANTIZE=nf4` | about a minute, 50 steps | Best open model on text and prompt adherence. Raise the backend's `IMAGE_SERVER_TIMEOUT_MS`. |
| `black-forest-labs/FLUX.2-klein-4B` | Apache 2.0 | yes, bf16 | a few seconds, 4 steps | Small and fast, similar tier to Z-Image Turbo. |
| `black-forest-labs/FLUX.2-dev` | non-commercial | with `QUANTIZE=nf4` | minutes | Closest open model to gpt-image-1 on photorealism. Check the licence before using it here. |

The numbers are estimates from published benchmarks, not measurements from
this service. Measure once deployed and adjust the backend timeout.

## Weights

Weights are not in the container image. They live in a Cloud Storage bucket
mounted read-only at `/weights`, with `HF_HOME=/weights/hf`, and the service
starts offline (`HF_HUB_OFFLINE=1`). Fill the bucket once per model:

```sh
# On any machine with gcloud and Python. HF_TOKEN only for gated repositories.
pip install huggingface_hub
HF_HOME=./weights/hf MODEL_ID=Tongyi-MAI/Z-Image-Turbo python download.py
gcloud storage rsync -r ./weights/hf gs://$WEIGHTS_BUCKET/hf
```

To bake the weights into the image instead, build with
`--build-arg BAKE_MODEL=1 --build-arg MODEL_ID=...` and drop the volume flags
from `deploy.sh`. Starts are quicker, image pulls are slower.

## Deploy

```sh
PROJECT_ID=my-project WEIGHTS_BUCKET=my-project-image-weights \
BACKEND_SA=backend@my-project.iam.gserviceaccount.com \
./deploy.sh
```

The script creates the Artifact Registry repository and the bucket if they do
not exist, builds with Cloud Build, and deploys to Cloud Run with one L4, no
zonal redundancy, concurrency 1, at most one instance and scale to zero. With
`MIN_INSTANCES=1` the GPU is always on, which removes the cold start and costs
about the price of an L4 for the month.

Then in the backend's environment:

```
IMAGE_SERVER_URL=https://image-server-xxxx.a.run.app
# IMAGE_SERVER_FIRST=true        put it ahead of OpenAI
# IMAGE_SERVER_TIMEOUT_MS=240000 cold start plus one render
```

The backend fetches an ID token for that URL from the metadata server when it
runs on Cloud Run. Elsewhere, set the same `IMAGE_SERVER_TOKEN` on both sides.

## Cold starts

A cold start loads 15 to 30 GB from the bucket and moves it to the GPU, which
takes one to three minutes. Cloud Run holds the request until the startup
probe passes, so the backend only needs a long enough timeout. The default
`IMAGE_SERVER_TIMEOUT_MS` is four minutes. A request that would outlive that
falls through to the next provider in the chain, and the instance stays warm
for the next one.

## Running locally

Needs an NVIDIA GPU with a recent driver.

```sh
python -m venv .venv && . .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt
HF_HUB_OFFLINE=0 uvicorn app:app --port 8080
curl -s localhost:8080/generate -H 'content-type: application/json' \
  -d '{"prompt":"a red fox in tall grass, morning light"}' -o fox.png
```
