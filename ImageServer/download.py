"""Fetch the model's weights into HF_HOME so the service starts offline.

Run once against the weights volume (or during the image build with
BAKE_MODEL=1). Reads MODEL_ID and HF_TOKEN from the environment.
"""

import os

from huggingface_hub import snapshot_download

model_id = os.environ.get('MODEL_ID', 'Tongyi-MAI/Z-Image-Turbo').strip()
path = snapshot_download(
    model_id,
    token=os.environ.get('HF_TOKEN') or None,
    # Only the weights the pipeline loads; PyTorch .bin duplicates and demo
    # assets are a large share of some repositories.
    allow_patterns=['*.json', '*.txt', '*.safetensors', '*.model', '*.py', 'tokenizer*', '*.tiktoken'],
    ignore_patterns=['*.bin', '*.pth', '*.ckpt', '*.gguf', 'assets/*', 'examples/*'],
)
print(f'{model_id} -> {path}')
