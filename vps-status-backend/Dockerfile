# Use an official Node.js runtime as a parent image (Node 22 LTS)
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
# Use npm ci for potentially faster and more reliable installs in CI/CD environments
RUN npm ci --only=production

# Bundle app source, including the GeoIP database
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define the command to run your app
CMD [ "node", "server.js" ]
