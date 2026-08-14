# TapeDeck Discovery Spike

TapeDeck is the first proposed Retro Suite sibling for physical media collection tracking, starting with movies and home-video formats.

This is a discovery spike, not an implementation commitment. The goal is to decide what a small, coherent first version should be and how much it should share with RetroVault without prematurely extracting a shared suite platform.

---

## Problem statement

Collectors of games often also collect adjacent physical media: VHS, DVD, Blu-ray, 4K UHD, LaserDisc, soundtracks, strategy guides, and related media artifacts.

RetroVault already proves the local-first/self-hosted collection-command-center pattern. TapeDeck should test whether that pattern works for physical media without turning RetroVault into a generic everything database.

---

## MVP shape

A first TapeDeck MVP should answer:

- What do I own?
- Which edition/format do I own?
- What condition is it in?
- What did I pay?
- What is it worth or how rare is it?
- What am I hunting for?
- What should I avoid rebuying in the field?

Recommended starting formats:

- VHS
- DVD
- Blu-ray
- 4K UHD
- LaserDisc, as an optional collector-grade format

---

## Candidate entities

### MediaTitle

- title
- original release year
- director / creator
- franchise / series
- region
- genres

### MediaCopy

- title reference
- format: VHS, DVD, Blu-ray, 4K UHD, LaserDisc
- edition / release label
- region code
- condition
- has slipcover / case / insert
- purchase price
- purchase date
- source
- notes

### Watchlist / Grails

- desired title
- desired format / edition
- target price
- priority
- notes

---

## What to avoid in the spike

- Do not build shared entity/search/tagging infrastructure yet. That remains backlog.
- Do not merge TapeDeck into RetroVault navigation unless the product direction is approved.
- Do not assume marketplace/pricing APIs are as clean as game pricing sources.
- Do not overfit to Plex integration; Plex can be a later connector, not the first data model.

---

## Spike deliverables

1. One-page product brief.
2. Minimal data model sketch.
3. One low-fidelity route/page sketch.
4. Decision on app shape:
   - sibling app;
   - RetroVault module;
   - shared monorepo package later;
   - postpone.
5. List of external metadata/pricing sources worth evaluating.

---

## Recommended decision bias

Start as a sibling product concept, not a RetroVault feature. Keep shared-suite architecture in backlog until there are at least two concrete products with real overlapping needs.

That lets TapeDeck teach us what is genuinely shared instead of forcing a generic platform too early.
