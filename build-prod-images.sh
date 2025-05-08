#!/bin/bash
set -e

# Build and push amd64 and arm64 images using buildx (multi-arch, same tag)
echo "Building and pushing multi-arch images (amd64 + arm64) with buildx..."
DOCKER_BUILDKIT=1 docker buildx build \
    -f Dockerfile.frontend \
    --target prod \
    --build-arg NODE_ENV=production \
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
    -t antoinedc44/ethernal-frontend:latest \
    --push .

DOCKER_BUILDKIT=1 docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f Dockerfile.backend \
    -t antoinedc44/ethernal-backend:latest \
    --push .

DOCKER_BUILDKIT=1 docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -f Dockerfile.pm2 \
    --target prod \
    -t antoinedc44/ethernal-pm2:latest \
    --push .

echo "All production images built & pushed successfully:"
echo "  ethernal-frontend:latest"
echo "  ethernal-backend:latest"
echo "  ethernal-pm2:latest" 
