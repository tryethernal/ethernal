#!/bin/bash

set -e

# Helper functions for random values
gen_hex() { openssl rand -hex "$1"; }
gen_str() { openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c "$1"; }

# Pre-generate all needed random values
ENCRYPTION_KEY=$(gen_hex 8) # 16 hex chars
ENCRYPTION_JWT_SECRET=$(gen_hex 32) # 64 hex chars
BACKEND_SECRET=$(gen_str 32)
PUSHER_APP_ID=$(gen_str 12)
PUSHER_KEY=$(gen_str 24)
PUSHER_SECRET=$(gen_str 32)
BULLBOARD_PASSWORD=$(gen_str 16)
PM2_SECRET=$(gen_str 32)

# Prompt for values
read -p "Enter value for APP_URL: " APP_URL
read -p "Enter value for EXPOSED_PORT [80]: " EXPOSED_PORT
EXPOSED_PORT="${EXPOSED_PORT:-80}"

# Set ETHERNAL_HOST and VITE_MAIN_DOMAIN based on EXPOSED_PORT
if [ "$EXPOSED_PORT" = "80" ]; then
  ETHERNAL_HOST="$APP_URL"
  VITE_MAIN_DOMAIN="$APP_URL"
else
  ETHERNAL_HOST="$APP_URL:$EXPOSED_PORT"
  VITE_MAIN_DOMAIN="$APP_URL:$EXPOSED_PORT"
fi

# Output backend.env to .env.prod and run/.env.prod
BACKEND_ENV_CONTENT="ENCRYPTION_KEY=$ENCRYPTION_KEY
ENCRYPTION_JWT_SECRET=$ENCRYPTION_JWT_SECRET
SECRET=$BACKEND_SECRET
CORS_DOMAIN=*
NODE_ENV=production
PUSHER_APP_ID=$PUSHER_APP_ID
PUSHER_KEY=$PUSHER_KEY
PUSHER_SECRET=$PUSHER_SECRET
REDIS_URL=redis://redis:6379
DB_HOST=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_NAME=ethernal
DB_PORT=5432
BULLBOARD_USERNAME=ethernal
BULLBOARD_PASSWORD=$BULLBOARD_PASSWORD
APP_URL=$APP_URL
PORT=8888"

mkdir -p run pm2-server

# Write backend env to .env.prod and run/.env.prod
printf "%s\n" "$BACKEND_ENV_CONTENT" > .env.prod
printf "%s\n" "$BACKEND_ENV_CONTENT" > run/.env.prod

# Output pm2.env to pm2-server/.env.prod
PM2_ENV_CONTENT="SECRET=$PM2_SECRET
ETHERNAL_SECRET=$BACKEND_SECRET
ETHERNAL_REDIS_URL=redis://redis:6379/0
ETHERNAL_HOST=$ETHERNAL_HOST"
printf "%s\n" "$PM2_ENV_CONTENT" > pm2-server/.env.prod

# Output nginx.conf to nginx.conf.prod
cat <<NGINX > nginx.conf.prod
server {
    listen $EXPOSED_PORT; # Externally exposed port
    server_name localhost;

    # Proxy all requests to the frontend service
    location / {
        proxy_pass http://frontend:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Optionally, you can keep static asset caching if you want nginx to cache responses from the frontend
    # location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
    #     expires 1y;
    #     add_header Cache-Control "public, no-transform";
    # }

    # location ~* \\.html$ {
    #     expires -1;
    #     add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    # }
}
NGINX
