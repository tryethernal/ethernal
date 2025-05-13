#!/bin/bash
set -e

# Build and push frontend image for amd64
DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 -f Dockerfile.frontend -t antoinedc44/ethernal-frontend:latest --push .

# Build and push backend image for amd64
DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 -f Dockerfile.backend -t antoinedc44/ethernal-backend:latest --push .

# Build and push pm2 image for amd64
DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 -f Dockerfile.pm2 --target prod -t antoinedc44/ethernal-pm2:latest --push .

echo "All amd64 images built and pushed successfully:"
echo "  antoinedc44/ethernal-frontend:latest"
echo "  antoinedc44/ethernal-backend:latest"
echo "  antoinedc44/ethernal-pm2:latest" 