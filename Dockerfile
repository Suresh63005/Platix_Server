# Use Node.js 22 as the base image
FROM node:22-alpine

# Install bash & inotify-tools for proper file watching
RUN apk add --no-cache bash inotify-tools

# Set the working directory inside the container
WORKDIR /home/node/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies (including nodemon)
RUN npm install

# instaed of Run npm install, we can use below command to install exact version 
# RUN npm ci (npm ci is used to install exact version of dependencies and ci means clean install)

# Copy all source files
COPY . .

# Expose the port the app runs on
EXPOSE 8081

# Start the app with nodemon for live reloading
CMD ["npm", "run", "dev"]
