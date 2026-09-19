FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
EXPOSE 9999
CMD ["sh", "-c", "npm start -- --chaincode-address $CHAINCODE_SERVER_ADDRESS --chaincode-id $CHAINCODE_ID"]
