"""Loads one diffusers pipeline once and renders through it one request at a time."""

import io
import threading

import torch
from diffusers import DiffusionPipeline

import settings

_pipe: DiffusionPipeline | None = None
# The GPU holds one job at a time. Cloud Run is deployed with concurrency 1,
# but a lock keeps a second request from doubling VRAM if that ever changes.
_lock = threading.Lock()


def _quantization():
    if settings.QUANTIZE == 'none':
        return None
    if settings.QUANTIZE != 'nf4':
        raise ValueError(f'QUANTIZE={settings.QUANTIZE!r} is not supported (none | nf4)')

    from diffusers.quantizers import PipelineQuantizationConfig

    return PipelineQuantizationConfig(
        quant_backend='bitsandbytes_4bit',
        quant_kwargs={
            'load_in_4bit': True,
            'bnb_4bit_quant_type': 'nf4',
            'bnb_4bit_compute_dtype': torch.bfloat16,
        },
        components_to_quantize=['transformer', 'text_encoder'],
    )


def load() -> None:
    global _pipe
    if _pipe is not None:
        return
    if not torch.cuda.is_available():
        raise RuntimeError('No CUDA device; this service needs a GPU')

    pipe = DiffusionPipeline.from_pretrained(
        settings.MODEL_ID,
        torch_dtype=torch.bfloat16,
        quantization_config=_quantization(),
    )
    pipe.to('cuda')
    pipe.set_progress_bar_config(disable=True)
    _pipe = pipe


def ready() -> bool:
    return _pipe is not None


def generate(
    prompt: str,
    *,
    negative_prompt: str | None,
    width: int,
    height: int,
    steps: int,
    seed: int | None,
    guidance: float | None,
    true_cfg: float | None,
) -> bytes:
    if _pipe is None:
        raise RuntimeError('Model is not loaded')

    generator = None
    if seed is not None:
        generator = torch.Generator(device='cuda').manual_seed(seed)

    kwargs: dict = {
        'prompt': prompt,
        'width': width,
        'height': height,
        'num_inference_steps': steps,
        'generator': generator,
    }
    # Only pass what the family uses; an unknown keyword is a TypeError in
    # diffusers rather than a warning.
    if guidance is not None:
        kwargs['guidance_scale'] = guidance
    if true_cfg is not None:
        kwargs['true_cfg_scale'] = true_cfg
    if negative_prompt:
        kwargs['negative_prompt'] = negative_prompt

    with _lock, torch.inference_mode():
        image = _pipe(**kwargs).images[0]

    out = io.BytesIO()
    image.save(out, format='PNG')
    return out.getvalue()
