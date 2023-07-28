FROM node:14

# Create app directory
WORKDIR /app

COPY . .
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)

# If you are building your code for production
# RUN npm ci --omit=dev
RUN npm install -g node-gyp
RUN apt-get install gcc -y
RUN cd /app/record/src && node-gyp clean && node-gyp configure && node-gyp build
RUN ls /app/record/src/build/Release
RUN cp /app/record/src/build/Release/agorasdk.node /app/record
RUN cd /app/server && npm install

EXPOSE 3000
CMD [ "node", "server/app.js" ]
