#!/bin/bash
set -e

# Accept tag as first argument, default to 'latest' if not provided
TAG="${1:-latest}"
# Accept platforms as second argument, default to 'linux/amd64,linux/arm64' if not provided
PLATFORMS="${2:-linux/amd64,linux/arm64}"

echo "Using image tag: $TAG"
echo "Using platforms: $PLATFORMS"

# Build and push amd64 and arm64 images using buildx (multi-arch, same tag)
echo "Building and pushing multi-arch images ($PLATFORMS) with buildx..."
DOCKER_BUILDKIT=1 docker buildx build \
    --platform $PLATFORMS \
    --no-cache \
    -f Dockerfile.frontend \
    --target prod \
    --build-arg VITE_SOKETI_PORT \
    --build-arg VITE_SOKETI_KEY \
    --build-arg VITE_SENTRY_DSN_SECRET \
    --build-arg VITE_SENTRY_DSN_PROJECT_ID \
    --build-arg VITE_SENTRY_AUTH_TOKEN \
    --build-arg VITE_SENTRY_ORG \
    --build-arg VITE_SENTRY_PROJET \
    --build-arg VITE_SENTRY_URL \
    --build-arg VITE_SENTRY_ENABLED \
    --build-arg VITE_VERSION \
    --build-arg VITE_IS_SELF_HOSTED=true \
    -t antoinedc44/ethernal-frontend:$TAG \
    --push .

DOCKER_BUILDKIT=1 docker buildx build \
    --platform $PLATFORMS \
    -f Dockerfile.backend \
    -t registry.fly.io/ethernal-backend:$TAG \
    -t antoinedc44/ethernal-backend:$TAG \
    --push .

DOCKER_BUILDKIT=1 docker buildx build \
    --platform $PLATFORMS \
    -f Dockerfile.pm2 \
    --target prod \
    -t registry.fly.io/ethernal-pm2:$TAG \
    -t antoinedc44/ethernal-pm2:$TAG \
    --push .

echo "All production images built & pushed successfully:"
echo "  ethernal-frontend:$TAG ($PLATFORMS)"
echo "  ethernal-backend:$TAG ($PLATFORMS)"
echo "  ethernal-pm2:$TAG ($PLATFORMS)" 
