# Orca Calibration - Umbrel App

Empacotamento para UmbrelOS do projeto:
https://github.com/flight505/CalibrationTool

## Arquitetura

O app original é uma aplicação web React/Vite. O Dockerfile baixa o código
do projeto, instala as dependências, gera o build e o serve com nginx.

O AI Assistant/PostgreSQL do projeto original NÃO é incluído nesta primeira
versão. As ferramentas de calibração funcionam sem banco de dados.

## Estrutura

- Dockerfile: cria a imagem da aplicação
- docker-compose.yml: definição do app para Umbrel
- umbrel-app.yml: manifesto Umbrel
- exports.sh: exports do app
- .github/workflows/build.yml: publica a imagem no GHCR
- nginx.conf: servidor web e fallback do SPA
- icon.svg: ícone
- .gitignore

## Publicação da imagem

O workflow do GitHub Actions publica:
ghcr.io/SEU_USUARIO/orca-calibration:latest

Edite `docker-compose.yml` e troque `SEU_USUARIO` pelo seu usuário GitHub.

Depois faça push do repositório. O GitHub Actions irá construir a imagem
automaticamente.

## Teste local

Depois que a imagem estiver publicada:

docker pull ghcr.io/SEU_USUARIO/orca-calibration:latest

No Umbrel, o app deve ser instalado usando o diretório deste projeto como
fonte de app. Para desenvolvimento local, também é possível construir:

docker build -t ghcr.io/SEU_USUARIO/orca-calibration:latest .

docker compose up -d
