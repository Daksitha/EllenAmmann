# Use official Node.js image
FROM node:20-slim

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Ensure sessions directory exists
RUN mkdir -p sessions

# Expose the ports the app runs on
EXPOSE 3001
EXPOSE 5001

# Set environment variables for host and ports
ENV HOST="0.0.0.0"
ENV PORT=3001
ENV SECONDARY_PORT=5001

# Command to run the application
CMD [ "node", "server.js" ]
