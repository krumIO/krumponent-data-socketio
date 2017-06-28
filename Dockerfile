FROM node:latest

MAINTAINER Colin Griffin <colin@krum.io>

RUN mkdir /src
COPY . /src/
WORKDIR /src

RUN npm install -g bower && npm install
RUN npm install -g polymer-cli
RUN bower install --allow-root

EXPOSE  8080
#CMD ["node", "index.js"]
CMD ["polymer", "serve"]