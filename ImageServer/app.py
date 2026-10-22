"""HTTP front for pipeline.py. One route draws, two report health."""

import logging
import secrets
import time
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

import pipeline
import settings

log = logging.getLogger('image-server')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')


@asynccontextmanager
async def lifespan(_: FastAPI):
    started = time.monotonic()
    log.info('loading %s (quantize=%s)', settings.MODEL_ID, settings.QUANTIZE)
    await run_in_threadpool(pipeline.load)
    log.info('loaded in %.0fs', time.monotonic() - started)
    yield


app = FastAPI(title='Ki.CL image server', lifespan=lifespan)


def require_token(request: Request) -> None:
    if not settings.AUTH_TOKEN:
        return
    header = request.headers.get('authorization', '')
    scheme, _, token = header.partition(' ')
    if scheme.lower() != 'bearer' or not secrets.compare_digest(token, settings.AUTH_TOKEN):
        raise HTTPException(status_code=401, detail='Bad or missing bearer token')


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1)
    negative_prompt: str | None = None
    width: int = Field(default=settings.DEFAULT_WIDTH, ge=256, le=settings.MAX_SIDE)
    height: int = Field(default=settings.DEFAULT_HEIGHT, ge=256, le=settings.MAX_SIDE)
    steps: int = Field(default=settings.DEFAULT_STEPS, ge=1, le=settings.MAX_STEPS)
    seed: int | None = Field(default=None, ge=0)
    guidance: float | None = settings.DEFAULT_GUIDANCE
    true_cfg: float | None = settings.DEFAULT_TRUE_CFG


@app.get('/healthz')
def healthz() -> dict:
    return {'ok': True}


@app.get('/ready')
def ready() -> dict:
    if not pipeline.ready():
        raise HTTPException(status_code=503, detail='Model still loading')
    return {'ok': True, 'model': settings.MODEL_ID}


@app.post('/generate', dependencies=[Depends(require_token)])
async def generate(body: GenerateRequest) -> Response:
    if not pipeline.ready():
        raise HTTPException(status_code=503, detail='Model still loading')

    prompt = body.prompt[: settings.MAX_PROMPT_CHARS]
    # Latent sizes are multiples of 16 for every family here.
    width = body.width - body.width % 16
    height = body.height - body.height % 16

    started = time.monotonic()
    try:
        png = await run_in_threadpool(
            pipeline.generate,
            prompt,
            negative_prompt=body.negative_prompt,
            width=width,
            height=height,
            steps=body.steps,
            seed=body.seed,
            guidance=body.guidance,
            true_cfg=body.true_cfg,
        )
    except Exception as error:  # noqa: BLE001 - anything from torch is a 500 with its message
        log.exception('generation failed')
        raise HTTPException(status_code=500, detail=str(error)) from error

    log.info('drew %dx%d in %d steps, %.1fs', width, height, body.steps, time.monotonic() - started)
    return Response(
        content=png,
        media_type='image/png',
        headers={'X-Generator': settings.MODEL_ID, 'X-Steps': str(body.steps)},
    )
