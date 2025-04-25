# Use an official Node.js runtime as a parent image (Node 22 LTS)
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
# Use npm ci for potentially faster and more reliable installs in CI/CD environments
RUN npm ci --only=production

# Bundle app source
COPY . .

# Make port 9101 available to other containers in the same network
EXPOSE 9101

# Define the command to run your app
CMD [ "node", "agent.js" ]
