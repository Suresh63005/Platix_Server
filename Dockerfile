FROM node:22-alpine

# Set the working directory
WORKDIR /home/node/app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies (including nodemon)
RUN npm install

# Install nodemon globally (optional, can be installed locally)
RUN npm install -g nodemon

# Expose the port the app runs on
EXPOSE 8081

# Use nodemon to start the application and watch for changes
CMD ["nodemon", "App.js"]  # Or whatever entry point your app uses
