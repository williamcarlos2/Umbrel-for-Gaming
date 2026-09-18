# LayerNexus — Umbrel custom app

Experimental package for `williamcarlos2/Umbrel-for-Gaming`.

## Included
- LayerNexus web + worker, built directly from upstream GitHub.
- OrcaSlicer API container.
- Uses the existing Spoolman on Umbrel at port 7912.
- Umbrel app proxy on port 8000 internally.

## Important
This package intentionally does NOT install a second Spoolman instance.

If your Spoolman is not reachable at host port 7912, change `SPOOLMAN_URL`
in docker-compose.yml before installing.

Upstream project:
https://github.com/peterus/LayerNexus
