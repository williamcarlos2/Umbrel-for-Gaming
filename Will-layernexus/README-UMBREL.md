# LayerNexus para Umbrel

Versão experimental para Umbrel-for-Gaming.

- Porta interna: 8000
- Acesso pelo app_proxy do Umbrel.
- Não publica 8000 no host.
- Usa o Spoolman existente em `host.docker.internal:7912`.
- OrcaSlicer API roda em container separado.
- Dados persistentes ficam em `${APP_DATA_DIR}/data/`.

## Permissões

O container cria explicitamente `appuser` com UID 100 e `appgroup` com GID 101.
Isso corrige o erro SQLite `unable to open database file` encontrado durante o teste.

Para teste direto fora do app_proxy, use um compose separado com `8001:8000`.
Esse mapeamento não deve ser usado no compose da loja.
