## Install dependencies and build application
FROM node:16.14.0-alpine as build

# Create app directory
WORKDIR /usr/app

# Copy application sources
COPY . .

# Install tools for building libraries on other platforms
RUN apk add build-base python3 py3-pip make gcc

# Install npm dependencies and build application
RUN npm install
RUN npm run build


## Run the application
FROM node:16.14.0-alpine as deploy

# Set directory ownership to node user
WORKDIR /usr/app

# Create storage and logs directories
RUN mkdir -p storage
RUN mkdir -p logs

# Set ownership of this directory to node user
RUN chown -R node .

# Copy package.json and build distribution files
COPY --chown=node:node package*.json /usr/app/
COPY --chown=node:node --from=build /usr/app/dist /usr/app/dist

# Install tools for building libraries on other platforms
RUN apk add build-base python3 py3-pip make gcc

# Install production dependencies
RUN npm install --production

# Change to node user
USER node

# Start server script
CMD ["npm", "run", "start:prod"]
