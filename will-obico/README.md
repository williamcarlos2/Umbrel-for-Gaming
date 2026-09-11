# Obico para Umbrel

Pacote Umbrel para executar o Obico Server localmente e integrá-lo com OctoPrint.

Serviços:
- Web/Django + Daphne: 3334
- Celery Tasks
- ML API: 3333
- Redis

Dados persistentes:
- `${APP_DATA_DIR}/data` — banco SQLite
- `${APP_DATA_DIR}/media` — fotos, timelapses e arquivos
- `${APP_DATA_DIR}/redis` — Redis

A imagem é construída a partir da branch `release` oficial:
https://github.com/TheSpaghettiDetective/obico-server

Depois de instalado, abra a porta 3334 do Umbrel e crie a conta inicial. Em seguida, no OctoPrint, instale o plugin Obico for OctoPrint e informe o endereço do servidor self-hosted durante o assistente.
