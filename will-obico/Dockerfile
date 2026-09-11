FROM alpine/git:2.47.2 AS source

WORKDIR /src

RUN git clone --depth 1 --branch release \
    https://github.com/TheSpaghettiDetective/obico-server.git .

FROM thespaghettidetective/web:base-1.18

WORKDIR /app

RUN pip install -U pip pipenv==2022.12.19

COPY --from=source /src/backend /app
COPY --from=source /src/frontend /frontend

RUN pip install -r requirements.txt

EXPOSE 3334