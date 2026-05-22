FROM node:20-bullseye-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# We need python3, pip, libgl1 for OpenCV, and tesseract-ocr
RUN apt-get update && apt-get install -y \\
    python3 \\
    python3-pip \\
    libgl1-mesa-glx \\
    libglib2.0-0 \\
    tesseract-ocr \\
    tesseract-ocr-eng \\
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies globally
# --break-system-packages is needed on newer pip versions
RUN pip3 install opencv-python numpy --break-system-packages

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Start the application
# We can dynamically run the API or Worker by passing an environment variable.
# e.g., RUN_WORKER=true to start the worker.
CMD ["npm", "run", "start"]
