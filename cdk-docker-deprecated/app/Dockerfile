
FROM public.ecr.aws/docker/library/node:18 AS build
WORKDIR /src
ADD package.json .
RUN npm install

FROM public.ecr.aws/docker/library/node:18-slim
COPY --from=build /src .
ADD . .
EXPOSE 8080
CMD ["node", "index.js"]