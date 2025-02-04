# Use Node.js 22 as the base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /home/node/app

# Copy package.json and package-lock.json (if present)
COPY package*.json ./

# Install app dependencies (including nodemon and other dependencies)
RUN npm install

# Copy all other files to the working directory inside the container
COPY . .

# Expose the port the app runs on
EXPOSE 8081

# Set the default command to run your application using npm start
CMD ["npm", "start"]
