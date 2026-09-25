"""Every knob the service reads, in one place, all from the environment."""

import os
from dataclasses import dataclass


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name, '').strip()
    return int(raw) if raw else default


def _float(name: str, default: float | None) -> float | None:
    raw = os.environ.get(name, '').strip()
    return float(raw) if raw else default


@dataclass(frozen=True)
class ModelDefaults:
    steps: int
    guidance: float | None
    true_cfg: float | None


# Per-family sampling defaults. Turbo and distilled models are trained for a
# few steps without classifier-free guidance; the full models want both.
# Anything not listed falls back to the last entry.
MODEL_DEFAULTS: dict[str, ModelDefaults] = {
    'Tongyi-MAI/Z-Image-Turbo': ModelDefaults(steps=8, guidance=0.0, true_cfg=None),
    'Qwen/Qwen-Image': ModelDefaults(steps=50, guidance=None, true_cfg=4.0),
    'Qwen/Qwen-Image-2512': ModelDefaults(steps=50, guidance=None, true_cfg=4.0),
    'black-forest-labs/FLUX.2-klein-4B': ModelDefaults(steps=4, guidance=1.0, true_cfg=None),
    'black-forest-labs/FLUX.2-dev': ModelDefaults(steps=28, guidance=3.5, true_cfg=None),
    'black-forest-labs/FLUX.1-schnell': ModelDefaults(steps=4, guidance=0.0, true_cfg=None),
}
FALLBACK_DEFAULTS = ModelDefaults(steps=28, guidance=3.5, true_cfg=None)

MODEL_ID = os.environ.get('MODEL_ID', 'Tongyi-MAI/Z-Image-Turbo').strip()
# 'none' | 'nf4'. NF4 through bitsandbytes shrinks the transformer and text
# encoder about four times, which is what lets Qwen-Image (20B) sit on a 24 GB
# L4 next to its 7B text encoder.
QUANTIZE = os.environ.get('QUANTIZE', 'none').strip().lower()
# Bearer token the backend sends. Empty means Cloud Run IAM is the only gate.
AUTH_TOKEN = os.environ.get('IMAGE_SERVER_TOKEN', '').strip()

DEFAULT_WIDTH = _int('DEFAULT_WIDTH', 1024)
DEFAULT_HEIGHT = _int('DEFAULT_HEIGHT', 1024)
MAX_SIDE = _int('MAX_SIDE', 1536)
MAX_STEPS = _int('MAX_STEPS', 60)
MAX_PROMPT_CHARS = _int('MAX_PROMPT_CHARS', 4000)

_family = MODEL_DEFAULTS.get(MODEL_ID, FALLBACK_DEFAULTS)
DEFAULT_STEPS = _int('DEFAULT_STEPS', _family.steps)
DEFAULT_GUIDANCE = _float('DEFAULT_GUIDANCE', _family.guidance)
DEFAULT_TRUE_CFG = _float('DEFAULT_TRUE_CFG', _family.true_cfg)
