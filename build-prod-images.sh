#!/bin/bash
set -e

# Build frontend image
docker build -f Dockerfile.frontend -t ethernal-frontend:latest .

# Build backend image (used by backend and all worker services)
docker build -f Dockerfile.backend -t ethernal-backend:latest .

# Build pm2 image (with prod target)
docker build -f Dockerfile.pm2 --target prod -t ethernal-pm2:latest .

echo "All production images built successfully:"
echo "  ethernal-frontend:latest"
echo "  ethernal-backend:latest"
echo "  ethernal-pm2:latest" 
