# Self-hosted Docker Hub images: one multi-arch tag per release, and `latest` kept current

## Problem

Release pipeline `.github/workflows/test_and_deploy.yml` (on `v*` tags) runs two parallel jobs:
`deploy_back_amd64` → `build-prod-images-amd64.sh <version>` and `deploy_back_arm64` →
`build-prod-images-arm64.sh <version>`. Both push single-platform images to the SAME Docker Hub tags:
`antoinedc44/ethernal-{frontend,backend,pm2}:<version>`. Whichever job pushes last overwrites the tag, so
every version tag is single-arch. Docker Hub today (checked 2026-11-12):

| tag | arch |
|-----|------|
| 5.18.4 | amd64 (arm64 job still running → will flip to arm64) |
| 5.18.3, 5.18.1, 5.18.0, 5.17.27x | arm64 |
| 5.18.2 | amd64 |

An amd64 self-hoster pulling an arm64-only tag gets "no matching manifest for linux/amd64".

Second problem: `docker-compose.prod.yml` uses `:latest` for frontend/backend/pm2, and `make start` /
`make update` pull it and run migrations. `latest` was last pushed 2025-05-15 (by a manual script,
`buildx-amd64-push.sh`), so default self-hosted installs run a ~18-month-old image.

## Goals

1. After a release, `antoinedc44/ethernal-{frontend,backend,pm2}:<version>` is ONE multi-arch manifest
   list containing linux/amd64 and linux/arm64.
2. `antoinedc44/ethernal-{frontend,backend,pm2}:latest` points at the same multi-arch manifest.
3. Fly deploy (`registry.fly.io/ethernal:<version>`, `registry.fly.io/ethernal-pm2:<version>`, amd64,
   used by `release_back`) is unchanged and not delayed.

## Non-goals

- Not moving arm64 builds to native arm runners, not changing Dockerfiles, build args, or QEMU setup.
- Not changing `docker-compose.prod.yml` / Makefile (they keep using `latest`).
- Not repairing historical tags (5.18.3 and earlier).

## Design

### A. Arch-suffixed Docker Hub tags in the build scripts

- `build-prod-images-amd64.sh`: every `antoinedc44/ethernal-*:$TAG` becomes `antoinedc44/ethernal-*:$TAG-amd64`.
  The Fly tags (`registry.fly.io/ethernal:$TAG`, `registry.fly.io/ethernal-pm2:$TAG`) stay exactly as they are.
  The pm2 build keeps a single build with both `-t` flags (Fly `$TAG`, Docker Hub `$TAG-amd64`).
- `build-prod-images-arm64.sh`: every `antoinedc44/ethernal-*:$TAG` becomes `$TAG-arm64`.
- Fix the stale comments/echo lines ("multi-arch, same tag") to say what the script now does.
- If `TAG` is not passed, the default stays `latest` (producing `latest-amd64` / `latest-arm64`); no
  workflow relies on that default.

### B. Two new jobs in `test_and_deploy.yml`: publish, then promote `latest`

`publish_dockerhub_multiarch` — `if: startsWith(github.ref, 'refs/tags/v')`,
`needs: [create_release, deploy_back_amd64, deploy_back_arm64]`, `environment: production`,
`permissions: contents: read`, job env `FLY_API_TOKEN: ''` (drop the workflow-level Fly credential) and
`VERSION: ${{ needs.create_release.outputs.current_version }}`. No checkout, no concurrency group. Steps:
1. Log in to Docker Hub (`DOCKERHUB_*` via `env:`, `printf '%s' "$DOCKERHUB_PASSWORD" | docker login ... --password-stdin`).
2. Publish: for each of `ethernal-frontend ethernal-backend ethernal-pm2`,
   `docker buildx imagetools create -t "$repo:$VERSION" "$repo:$VERSION-amd64" "$repo:$VERSION-arm64"`.
3. Verify: for each repo, `docker buildx imagetools inspect --raw "$repo:$VERSION"` piped to
   `jq -e '(.manifests | type == "array") and any(.manifests[]; .platform.os == "linux" and .platform.architecture == "amd64") and any(.manifests[]; .platform.os == "linux" and .platform.architecture == "arm64")'`.
   Attestation descriptors (`unknown/unknown`) are tolerated. (`jq` is preinstalled on `ubuntu-latest`.)

`promote_dockerhub_latest` — same `if`, `needs: [publish_dockerhub_multiarch]`, `environment: production`,
`permissions: contents: read`, `FLY_API_TOKEN: ''`, and
`concurrency: {group: dockerhub-latest, cancel-in-progress: false}`. Steps: pinned checkout
(`actions/checkout@3d3c42e5… # v7.0.1`, `fetch-depth: 0`, `persist-credentials: false`), `git fetch --quiet --tags --force origin`,
Docker Hub login, then **Promote latest**. It does not promote its own `VERSION`: it takes the 5 newest stable
tags (`git tag -l 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -Vr`), walks them newest to oldest and picks
the first whose `<version>` tag in ALL three repos passes the same jq structural check (only a registry "not found" counts as
not published; any other registry error fails the job so a transient error can never make an older release win). If none qualifies it logs and exits 0 without touching `latest`. For the chosen version it runs
`docker buildx imagetools create -t "$repo:latest" "$repo:<chosen>"` for each repo and asserts
`docker buildx imagetools inspect "$repo:latest" --format '{{json .Manifest.Digest}}'` equals the same for `"$repo:<chosen>"`.
It logs the chosen version and why newer candidates were skipped.

Why a separate, locked job: whichever promoter runs last always promotes the newest fully published stable
release, so cancelled pending promoters and out-of-order releases converge; the lock stops two promoters
interleaving their writes. GitHub keeps only one pending job per concurrency group, so a third release may
cancel a queued promoter — harmless, because the surviving promoter picks the newest published release anyway.
The publish job has no lock (version tags are independent per release). The lock serialises each promoter's whole
walk + write, and every promoter decides from the registry state at the time it runs, so an older run can never
overwrite `latest` after a newer release has promoted.

Notes:
- All `${{ }}` values reach shell via `env:` only (in the new jobs).
- Prereleases and odd tags are never candidates, so they never move `latest`.
- If an arch build job fails, the publish job is skipped (`needs`) and so is the promoter; neither `<version>` nor
  `latest` moves, and the `-amd64`/`-arm64` staging tags are harmless. Recovery = re-run the failed jobs (every step
  is idempotent). If the failed release is the newest tag, a later promoter simply keeps promoting the newest
  fully published older release until it is fixed. A failure mid-promotion can leave `latest` mixed across the three
  repos until the next promoter run; accepted (rare, self-healing).
- `release_back` keeps `needs: [deploy_back_amd64, create_release]` — Fly is not delayed by the arm64 build.

### C. Retire `buildx-amd64-push.sh`

It manually overwrites all three `latest` tags with amd64-only images, recreating the bug. Not referenced
anywhere (`git grep`). Delete it.

### Accepted risk: first `latest` move jumps ~18 months

`latest` is what `make start` / `make update` already pull; the README tells self-hosters to check out the
latest release tag, whose compose file also uses `latest`. Making `latest` current is the intended state, not
a new behaviour. The pre-existing Makefile ordering (start containers, then migrate) is out of scope. The
release notes for the first release with this change will tell self-hosters on `latest` to back up Postgres
before `make update`.

## Verification (implementer, before PR)

The workflow only runs on tags, so verify the mechanics on a Freestyle VM (Docker preinstalled) with a
local registry instead of Docker Hub:
1. `docker run -d -p 5000:5000 registry:2`; set up `docker buildx create --use --driver-opt network=host`
   and binfmt (`docker run --privileged --rm tonistiigi/binfmt --install arm64`).
2. Build a trivial Dockerfile for linux/amd64 → `localhost:5000/t:1.0.0-amd64` and linux/arm64 →
   `localhost:5000/t:1.0.0-arm64` (push).
3. Extract the run blocks of the publish steps and of the promoter from the committed workflow (parameterised by
   registry prefix only for the test; the committed workflow keeps the Docker Hub names) and run them against
   `localhost:5000/ethernal-{frontend,backend,pm2}` in scratch git repos holding the relevant `v*` tags (the
   `git fetch` step is not extracted):
   a. normal: `1.0.0` published → promoter sets `latest` = `1.0.0` (multi-arch, digests equal) in all three; covers
      provenance-enabled and plain per-arch sources;
   b. out-of-order: `v1.0.0` and `v1.1.0` both published, promoter run "for 1.0.0" → `latest` = `1.1.0`;
   c. newest tag in git but not published (`v1.2.0`, no images) → `latest` = `1.1.0`;
   d. newest partially published (`1.2.0` in two repos only, or single-arch in one) → skipped, `1.1.0` chosen;
   e. prerelease `v1.3.0-rc.1` with images → ignored;
   f. publish job fails on a missing arch → job fails, promoter not reached, `latest` untouched;
   g. re-run → no-op success, digests unchanged.
4. `actionlint` on the workflow (`docker run --rm -v $PWD:/repo -w /repo rhysd/actionlint:latest`) and
   `bash -n` + `shellcheck` on both scripts.
Real end-to-end proof is the next release: Docker Hub tag `<version>` lists amd64 + arm64.

## Libraries considered

| Need | Chosen | Considered / why rejected |
|------|--------|---------------------------|
| Merge per-arch images into one tag | `docker buildx imagetools create` (docker/buildx, Apache-2.0, 4.5k★, pushed 2026-11-12; preinstalled on runners) | `docker/build-push-action` + `docker/metadata-action` with push-by-digest (Apache-2.0, 5.4k★, active) — Docker's documented pattern but a rewrite of both jobs plus new third-party actions in a workflow that exposes `FLY_API_TOKEN`; `docker manifest create` — older experimental CLI, superseded by imagetools; one combined `--platform linux/amd64,linux/arm64` job — would make the Fly deploy wait for the slow emulated arm64 build |
| Validate manifest JSON | `jq` (preinstalled on runners, 36k★, active) | grep — rejected (matches strings anywhere, Astra review) |
| Newest-release check | stable-tag regex + `sort -V` (coreutils) | GitHub releases API — extra token use for no gain |
| Test tooling | `registry:2`, `tonistiigi/binfmt`, `rhysd/actionlint`, `shellcheck` (verification only, not committed) | — |
