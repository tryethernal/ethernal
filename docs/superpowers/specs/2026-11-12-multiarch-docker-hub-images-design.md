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

### B. New job `publish_dockerhub_multiarch` in `test_and_deploy.yml`

```yaml
publish_dockerhub_multiarch:
  if: startsWith(github.ref, 'refs/tags/v')
  needs: [create_release, deploy_back_amd64, deploy_back_arm64]
  runs-on: ubuntu-latest
  environment: production
  permissions:
    contents: read
  concurrency:
    group: dockerhub-publish
    cancel-in-progress: false
  env:
    FLY_API_TOKEN: ''            # Docker-Hub-only job: drop the workflow-level Fly credential
    VERSION: ${{ needs.create_release.outputs.current_version }}
  steps:
    - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1 (pinned: needed for tags only)
      with:
        fetch-depth: 0
        persist-credentials: false
    - name: Log in to Docker Hub
      env:
        DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
        DOCKERHUB_PASSWORD: ${{ secrets.DOCKERHUB_PASSWORD }}
      run: printf '%s' "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
    - name: Publish multi-arch version tags     # step 1: all three <version> tags
    - name: Verify version tags                 # step 2: all three, structural check (below)
    - name: Promote latest                      # step 3: only if verified AND newest release
```

Step 1, for each of `ethernal-frontend ethernal-backend ethernal-pm2`:
`docker buildx imagetools create -t "$repo:$VERSION" "$repo:$VERSION-amd64" "$repo:$VERSION-arm64"`.

Step 2, for each repo: `docker buildx imagetools inspect --raw "$repo:$VERSION"` piped to
`jq -e '(.manifests | type == "array") and any(.manifests[]; .platform.os == "linux" and .platform.architecture == "amd64") and any(.manifests[]; .platform.os == "linux" and .platform.architecture == "arm64")'`.
Attestation descriptors (`unknown/unknown`) are tolerated. Any failure fails the job BEFORE step 3, so
`latest` is never touched by a broken release. (`jq` is preinstalled on `ubuntu-latest`.)

Step 3 runs only if `VERSION` is a stable `MAJOR.MINOR.PATCH` (regex `^[0-9]+\.[0-9]+\.[0-9]+$`) AND
`v$VERSION` equals the highest STABLE tag in the repo
(`git tag -l 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n1`); otherwise log why
`latest` is left alone and exit 0 (prereleases/odd tags never move `latest`). Known limitation, accepted:
if a newer stable tag exists but its release failed, an older release won't move `latest`; the fix is to
ship the next release (fix forward), which this repo always does. Then for each repo: `docker buildx imagetools create -t "$repo:latest" "$repo:$VERSION"`, and
assert `docker buildx imagetools inspect "$repo:latest" --format '{{json .Manifest.Digest}}'` equals the
same for `"$repo:$VERSION"`.

Notes:
- All `${{ }}` values reach shell via `env:` only.
- The concurrency group serialises publications; the newest-tag check prevents an older release (or a
  re-run of one) from moving `latest` backwards.
- If an arch build job fails, this job is skipped (`needs`), so neither `<version>` nor `latest` moves;
  the `-amd64`/`-arm64` staging tags may exist and are harmless. Recovery = re-run the failed jobs (every step is
  idempotent) while the release is still the newest stable one; otherwise the next stable release fixes it. A failure mid-step-3 can leave `latest` mixed across the three
  repos until the re-run; accepted (rare, self-healing on re-run).
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
3. Extract steps 1–3 of B into the real shell (parameterised by registry prefix only for the test; the
   committed workflow keeps the Docker Hub names) and run against three repos `localhost:5000/{a,b,c}`:
   a. provenance-enabled sources (default `buildx build --push`) and plain sources → `1.0.0` and `latest`
      list linux/amd64 + linux/arm64, digests equal;
   b. one repo missing `-arm64` → job fails in step 1/2, `latest` of all three unchanged;
   c. publishing `0.9.0` after `1.0.0` (git tags `v0.9.0`, `v1.0.0` in a scratch repo) → `0.9.0` tag
      published, `latest` still equals `1.0.0`;
   d. re-running `1.0.0` is a no-op success;
   e. partial promotion: make step 3 fail after the first repo's `latest` moved (e.g. remove a source tag
      of the second repo between steps), then restore and re-run → all three `latest` equal their `1.0.0`
      digests;
   f. tag eligibility: `v1.1.0-rc.1` alongside `v1.0.0` → `1.0.0` still promotes; publishing `1.1.0-rc.1`
      does not move `latest`.
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
