# RetroVault GitHub Admin Next Steps

This is the exact repo-admin follow-up after publishing `autopush`, `nightly`, and `prod`.

## Current observed state

- `master`, `prod`, `nightly`, and `autopush` all currently exist on origin
- direct push to `master` triggered protection warnings but succeeded via admin bypass
- GitHub already reports:
  - changes should go through a pull request
  - required status checks are expected

That means some protection is already present and should be reviewed, not recreated blindly.

## 1. Inspect existing branch protection / rulesets

Check which current rule or ruleset is hitting `master`.

In GitHub repo settings, review:
- Branch protection rules
- Repository rulesets
- Required status checks currently configured

Goal:
- understand whether the current `master` rule should be copied to `prod`
- avoid conflicting rules between old `master` and new `prod`

## 2. Set `prod` as the default branch

Recommended once you're comfortable with the new lane model.

Why:
- makes release intent explicit
- shifts GitHub UI defaults away from `master`
- reduces future doc drift

Do this only after confirming README badges/docs and workflows are acceptable.

## 3. Create or migrate protections

### `autopush`
Recommended:
- minimal friction
- optionally require CI
- allow maintainer direct pushes

### `nightly`
Recommended:
- require `CI / test-and-build`
- restrict direct pushes if desired
- allow GitHub Actions bot updates

### `prod`
Recommended:
- require `CI / test-and-build`
- require pull request or a conscious manual promotion path
- restrict direct pushes except emergency/admin
- allow GitHub Actions updates if workflow-driven promotion is desired

## 4. GitHub Actions permissions

Repo settings -> Actions -> General:
- Workflow permissions: **Read and write permissions**
- Allow GitHub Actions to create and approve pull requests: optional

Needed because promotion workflows push branch updates.

## 5. Environments

Create:
- `dev`
- `nightly`
- `production`

These can later hold:
- SSH secrets
- deploy approvals
- environment-scoped variables

## 6. Secrets for deploy jobs

Current workflow files now include SSH-based deploy job scaffolding.

Recommended environment secrets:
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- optional `DEPLOY_PORT`

Recommended environment variables:
- `DEPLOY_APP_DIR` (set this explicitly to your deployment checkout path, for example `/srv/retrovault`)

Suggested environment mapping:
- environment `dev` -> deploys `bash scripts/deploy.sh dev autopush`
- environment `nightly` -> deploys `bash scripts/deploy.sh nightly nightly`
- environment `production` -> deploys `bash scripts/deploy.sh prod prod`

## 7. Master retirement plan

Suggested sequence:
1. keep `master` temporarily as an alias/safety net
2. move default branch to `prod`
3. validate CI + promotion + release flow on new branches
4. update remaining badges/docs if needed
5. then either lock `master` hard or retire it

## 8. Practical verification

After settings are updated:
1. push a trivial commit to `autopush`
2. confirm `ci.yml` runs
3. confirm `promote-nightly.yml` updates `nightly`
4. manually run `promote-prod.yml`
5. create a tag from `prod`
6. confirm `release.yml` creates the release
