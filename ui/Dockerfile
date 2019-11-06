FROM node:12.8.0 as build

WORKDIR /usr/src/app
COPY . .

ENV PATH /usr/src/app/node_modules/.bin:$PATH

RUN npm install --client
RUN npm run build

####
FROM nginx:latest

ENV RESGATE_HOST=http://127.0.0.1:8080

COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY nginx.template .
COPY start.sh .

EXPOSE 9090

ENTRYPOINT ["./start.sh"]