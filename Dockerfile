# Use official Node.js image based on Debian (Bullseye slim includes basic native dependencies)
FROM node:20-bullseye-slim

# Set working directory inside the container
WORKDIR /usr/src/app

# Install LibreOffice and required fonts/libraries for PDF conversion and Canvas
# We use --no-install-recommends to keep the image size as small as possible
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    fonts-liberation \
    fontconfig \
    libuuid1 \
    libpng16-16 \
    libjpeg62-turbo \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose the API port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
