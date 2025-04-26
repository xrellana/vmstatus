# Use Node.js as the base image
FROM node:22-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install a simple HTTP server to serve the static content
RUN npm install -g serve

# Copy the .env file first (if it exists)
COPY .env* ./

# Copy the rest of the application code
COPY . .

# Build the application
# The .env file will be automatically used by Vite during the build process
RUN npm run build

# Expose port 3001 (using a different port than the backend)
EXPOSE 3001

# Serve the built application using serve
CMD ["serve", "-s", "dist", "-l", "3001"]
