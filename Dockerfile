FROM node:14-alpine

ENV PORT 80

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

ADD . /usr/src/app
RUN npm run build

CMD ["node", "dist/index.js"]
EXPOSE 80