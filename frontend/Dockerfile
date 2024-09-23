FROM node:18.19.1-alpine

WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

COPY package.json /app/package.json

RUN npm install -g @angular/cli

RUN npm install

COPY . /app

EXPOSE 4200

CMD npm run start
