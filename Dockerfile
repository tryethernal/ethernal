FROM node:16 AS front
WORKDIR /client
ENV VUE_APP_NODE_ENV=production
ENV VUE_APP_API_ROOT=https://app.VUE_APP_MAIN_DOMAIN_PLACEHOLDER
ENV VUE_APP_MAIN_DOMAIN=VUE_APP_MAIN_DOMAIN_PLACEHOLDER
ENV VUE_APP_PUSHER_KEY=VUE_APP_PUSHER_KEY_PLACEHOLDER
COPY public/ ./public/
COPY src/ ./src/
COPY babel.config.js .firebaserc package.json yarn.lock vue.config.js _redirects _headers ./
RUN yarn install --network-timeout 100000
RUN yarn build

FROM node:16 AS back
ENV ENCRYPTION_KEY=
ENV ENCRYPTION_JWT_SECRET=
ENV APP_URL=
ENV PUSHER_APP_ID=
ENV PUSHER_KEY=
ENV PUSHER_SECRET=
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV DB_HOST=postgres
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV DB_NAME=ethernal
ENV DB_PORT=5432
ENV BULLBOARD_USERNAME=ethernal
ENV BULLBOARD_PASSWORD=ethernal
ENV SECRET=secret
ENV PORT=8888
ENV NODE_ENV=production
ENV CORS_DOMAIN=*
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
COPY run/instrument.js .
COPY run/workers ./workers/
COPY run/package*.json ./

FROM back AS dev_back
RUN npm install
RUN npm install nodemon -g

FROM back AS prod_back
COPY ethernal-95a14-19f78a7e26cc.json ./ethernal-95a14-19f78a7e26cc.json
RUN npm ci --only=production

FROM back AS prod_all
RUN mkdir dist
COPY web_entrypoint.sh ./web_entrypoint.sh
RUN chmod +x ./web_entrypoint.sh
COPY --from=front /client/dist ./dist
COPY run/.sequelizerc ./
COPY run/migrations ./migrations
RUN npm ci --only=production
RUN npm install -g sequelize-cli
