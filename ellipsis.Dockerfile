FROM node:16

WORKDIR /app

RUN apt-get -y update
RUN apt-get -y install git

COPY . .
RUN git init
RUN yarn
RUN npm --prefix run/ install
RUN npm --prefix pm2-server/ install
