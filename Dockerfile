FROM node:13-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD package.json package.json
RUN npm install
ADD . /usr/src/app

EXPOSE 80
CMD ["node", "index.js"]
