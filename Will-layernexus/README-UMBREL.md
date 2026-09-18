# LayerNexus para Umbrel

Versão experimental para o repositório Umbrel-for-Gaming.

- Porta interna do LayerNexus: 8000
- Não expõe `8000:8000` no host; o acesso é feito pelo `app_proxy` do Umbrel.
- O Spoolman existente é usado em `host.docker.internal:7912`.
- OrcaSlicer API roda no container separado.
- O código do LayerNexus é baixado durante o build da imagem.

## Importante

A porta `8000` não precisa estar livre no host quando o app usa `app_proxy`. O `port` do `umbrel-app.yml` deve corresponder à porta interna da aplicação (8000).
