FROM node:20-bookworm

WORKDIR /app

# Fix Docker Desktop ARM64 network bugs causing Hash Sum mismatches
RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99fixbadproxy && \
    echo "Acquire::BrokenProxy    true;" >> /etc/apt/apt.conf.d/99fixbadproxy

# Install system dependencies, python, OpenCV deps, Tesseract, and redis-server
RUN apt-get update --fix-missing && apt-get install -y \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies globally (with --break-system-packages for Debian Bookworm compliance)
RUN pip3 install --break-system-packages opencv-python numpy

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript code
RUN npm run build

# Start Redis in the background, then start the Node.js application using exec to replace PID 1
CMD redis-server --daemonize yes && exec node dist/index.js
