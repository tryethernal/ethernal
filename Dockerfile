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
COPY run/package*.json .

FROM base AS dev
RUN npm install
RUN npm install nodemon -g

FROM base AS prod
COPY ethernal-95a14-19f78a7e26cc.json ./ethernal-95a14-19f78a7e26cc.json
# RUN echo "license_key: faf019c91d1b9323fc8347473247e8da74f8NRAL" | sudo tee -a /etc/newrelic-infra.yml
# RUN sudo apt-get update -y && apt-get install --no-install-recommends -y libcap2-bin gnupg ca-certificates systemd
# RUN curl -s https://download.newrelic.com/infrastructure_agent/gpg/newrelic-infra.gpg | sudo apt-key add -
# RUN printf "deb https://download.newrelic.com/infrastructure_agent/linux/apt focal main" | sudo tee -a /etc/apt/sources.list.d/newrelic-infra.list
# RUN sudo apt-get update -y && sudo NRIA_MODE="PRIVILEGED" apt-get install newrelic-infra -y
# RUN npm install nodemon -g
RUN npm ci --only=production
