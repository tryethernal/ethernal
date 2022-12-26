FROM node:16 AS base
WORKDIR /app
COPY run/api ./api
COPY run/config ./config
COPY run/jobs ./jobs
COPY run/lib ./lib
COPY run/middlewares ./middlewares
COPY run/models ./models
COPY run/webhooks ./webhooks
COPY run/app.js .
COPY run/index.js .
COPY run/queues.js .
COPY run/scheduler.js .
COPY run/workers ./workers/
COPY run/package*.json .

FROM base AS dev
RUN npm install
RUN npm install nodemon -g

FROM base AS prod
COPY ethernal-95a14-19f78a7e26cc.json ./ethernal-95a14-19f78a7e26cc.json
ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_APP_NAME=backend
RUN npm ci --only=production
