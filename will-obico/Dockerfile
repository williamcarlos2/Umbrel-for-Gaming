FROM alpine/git:2.47.2 AS source
WORKDIR /src
RUN git clone --depth 1 --branch release https://github.com/TheSpaghettiDetective/obico-server.git .

FROM node:20-bookworm AS frontend
WORKDIR /src
COPY --from=source /src/frontend /src/frontend
WORKDIR /src/frontend
RUN npm ci
RUN npm run build

FROM thespaghettidetective/web:base-1.18 AS web
WORKDIR /app
RUN pip install -U pip pipenv==2022.12.19
COPY --from=source /src/backend /app
COPY --from=frontend /src/frontend /frontend
RUN pip install -r requirements.txt
EXPOSE 3334

FROM thespaghettidetective/ml_api_base:1.4 AS ml_api
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=source /src/ml_api /app
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN mkdir -p /model_cache/ml_api/darknet /model_cache/ml_api/onnx /model_cache/ml_api/rknn  && curl -fsSL -o /model_cache/ml_api/darknet/model-weights.darknet "$(cat model/model-weights.darknet.url | tr -d '\r')"  && curl -fsSL -o /model_cache/ml_api/onnx/model-weights.onnx "$(cat model/model-weights.onnx.url | tr -d '\r')"  && curl -LfsSL -o /model_cache/ml_api/rknn/model-weights.rknn "$(cat model/model-weights.rknn.url | tr -d '\r')"
EXPOSE 3333
