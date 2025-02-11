# Use Node.js 22 as the base image
FROM node:22-alpine

# Install bash & inotify-tools for proper file watching
RUN apk add --no-cache bash inotify-tools

# Set the working directory inside the container
WORKDIR /home/node/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install dependencies using `npm ci` for exact versions and faster builds
RUN npm ci

# Copy all source files
COPY . .

# Ensure proper permissions for the node user
RUN chown -R node:node /home/node/app

# Use non-root user for security
USER node

# Expose the port the app runs on
EXPOSE 8081

# Start the app with nodemon for live reloading
CMD ["npm", "run", "dev"]
