# PrintStash para Umbrel

Empacotamento do PrintStash v0.13.0 para a loja pessoal do Umbrel.

## Imagens

- ghcr.io/xiao-villamor/printstash-frontend:0.13.0
- ghcr.io/xiao-villamor/printstash-api-lite:0.13.0

## Porta

- Porta externa do Umbrel: 8182
- Frontend interno: 3000
- API interna: 8000

## Persistência

O Compose usa volumes Docker persistentes para biblioteca, thumbnails, banco SQLite, staging e backups, seguindo o deployment simples recomendado pelo projeto.

## Primeiro acesso

Após instalar, abrir o app e seguir o assistente de configuração. Na v0.13.0, o primeiro cadastro usa um setup token mostrado nos logs do serviço `api`.

## Upstream

https://github.com/xiao-villamor/PrintStash
https://www.printstash.org
