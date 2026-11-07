FROM python:3.12-slim

WORKDIR /omr

COPY requirements.txt ./
RUN python -m venv .venv \
  && .venv/bin/pip install --no-cache-dir -r requirements.txt \
  && .venv/bin/homr --init

COPY drawing.py server.py ./

ENV PORT=8080
EXPOSE 8080

CMD [".venv/bin/python", "server.py"]
