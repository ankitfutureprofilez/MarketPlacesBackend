# Use official Node.js LTS image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose port (adjust according to your app, default Express port 3000)
EXPOSE 5000

# Command to run the app
CMD ["node", "src/app.js"]