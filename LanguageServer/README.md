# Language server

The text and vision half of self-hosting: one open-weight vision-language
model served by [vLLM](https://github.com/vllm-project/vllm) on a Cloud Run
GPU service. There is no code here, only a deploy script, because vLLM's own
container already exposes the OpenAI-compatible `/v1/chat/completions` route
that the backend's `self-hosted` text and vision providers call.

One model answers everything the backend used gpt-4o-mini and gpt-4o for:
specimen resolution and blurbs for TaxonVisual, the ImageAgent's classifier,
clarifier and prompt refinement, and the vision scoring of every drawn image.
With `SELF_HOSTED_ONLY=true` and no OpenAI key, the classifier on this model is
also the safety check, since OpenAI's moderation endpoint is skipped.

This folder is self-contained so it can move to its own repository unchanged.
Its sibling `ImageServer/` does the same for the image model.

## Model

| Model | Licence | Fits an L4 (24 GB) | Notes |
|---|---|---|---|
| `Qwen/Qwen3-VL-8B-Instruct` (default) | Apache 2.0 | yes, bf16 at 8k context | Text and images in one model; strong at reading a picture and answering in JSON, which is what the scorer and classifier need. |
| `Qwen/Qwen3-VL-8B-Instruct-FP8` | Apache 2.0 | yes, with more room | Same model, half the weight; leaves more of the L4 for context and batch. |
| `google/gemma-3-12b-it` | Gemma licence | needs FP8 or a bigger GPU | Also a capable VLM; check the licence terms. |

Set `MODEL_ID` on both `deploy.sh` and the backend's `LLM_SERVER_MODEL`, since
vLLM requires the model name in each request.

## Weights

Same arrangement as the image server: a Cloud Storage bucket mounted read-only
at `/weights`, `HF_HOME=/weights/hf`, offline at start. Both services can share
one bucket. Fill it once per model:

```sh
pip install huggingface_hub
HF_HOME=./weights/hf MODEL_ID=Qwen/Qwen3-VL-8B-Instruct python ../ImageServer/download.py
gcloud storage rsync -r ./weights/hf gs://$WEIGHTS_BUCKET/hf
```

## Deploy

```sh
PROJECT_ID=my-project WEIGHTS_BUCKET=my-project-model-weights \
BACKEND_SA=backend@my-project.iam.gserviceaccount.com \
./deploy.sh
```

Then in the backend's environment:

```
LLM_SERVER_URL=https://language-server-xxxx.a.run.app
# LLM_SERVER_MODEL=Qwen/Qwen3-VL-8B-Instruct
# LLM_SERVER_TIMEOUT_MS=240000
SELF_HOSTED_ONLY=true
```

The backend fetches an ID token for that URL from the metadata server when it
runs on Cloud Run. Elsewhere, set `LLM_SERVER_TOKEN` on the deploy and on the
backend; vLLM checks it as a bearer.

## Keeping it warm

Text calls are more frequent and more latency-sensitive than drawings: every
message to the ImageAgent goes through the classifier before anything else,
and a cold vLLM instance takes one to two minutes to load the model. Deploy
with `MIN_INSTANCES=1` once the setup is proven. That keeps one L4 on all the
time, at roughly the hourly L4 price for the month, and removes the cold start
from the conversational path. The image server can stay at zero, since a
drawing already takes a while and the agent shows progress meanwhile.

## Checking it

```sh
TOKEN=$(gcloud auth print-identity-token --audiences "$LLM_SERVER_URL")
curl -s "$LLM_SERVER_URL/v1/chat/completions" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"model":"Qwen/Qwen3-VL-8B-Instruct","messages":[{"role":"user","content":"One sentence about foxes."}],"max_tokens":60}'
```
