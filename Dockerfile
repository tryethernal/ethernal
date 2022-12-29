FROM ubuntu:20.04 AS base

WORKDIR /app

RUN apt-get update -y
RUN apt-get install --no-install-recommends -y sudo curl ca-certificates

RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o ./n
RUN chmod 777 n
RUN /bin/bash n 16.14.0

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
COPY run/package*.json ./

FROM base AS dev
RUN npm install
RUN npm install nodemon -g

FROM base AS prod
COPY ethernal-95a14-19f78a7e26cc.json ./ethernal-95a14-19f78a7e26cc.json
RUN curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | sudo bash
RUN sudo NEW_RELIC_API_KEY=NRAK-DSHS3WXDY27QDVD5UU5YRR5V0WH NEW_RELIC_ACCOUNT_ID=3751919 /usr/local/bin/newrelic install
RUN npm install nodemon -g
RUN npm ci --only=production
