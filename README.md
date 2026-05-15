# Intelligent Media Processing Pipeline

A robust, asynchronous backend system for analyzing vehicle images using heuristics and machine learning via Node.js, Express, BullMQ, PostgreSQL, OpenCV, and Tesseract.

## Architecture

This service is split into two primary components:
1. **API Layer (`src/api`)**: An Express server handling HTTP ingress, multipart file uploads via Multer, and enqueueing jobs.
2. **Worker Layer (`src/worker`)**: A BullMQ background worker polling Redis for pending jobs, executing heavy image analysis (OpenCV, OCR, pHash), and saving results.

**Tech Stack:**
- **Language**: TypeScript (Node.js)
- **Database**: PostgreSQL 15 (Managed via Prisma ORM)
- **Queue**: Redis + BullMQ (Handles retries and concurrency)
- **Analysis Tools**: Tesseract.js (OCR), OpenCV (via Python child process for stability), jimp/imghash (pHash), exifr (Screenshot detection).

## Heuristics Implemented

- **Blur Detection**: Calculates the Variance of the Laplacian using OpenCV. Low scores indicating fewer edges = blurry image.
- **Brightness Analysis**: Converts image to HSV space and averages the 'Value' channel to detect extreme low-light conditions.
- **Duplicate Detection**: Computes a 16-bit Perceptual Hash (pHash) and checks against previously processed jobs in the database.
- **OCR & Plate Validation**: Extracts text using Tesseract.js. Applies Regex to validate and identify Indian Number Plates (`MH 12 AB 1234`).
- **Screenshot/Photo-of-Photo**: Heuristically checks for the complete absence of EXIF data (which happens when screenshots are taken) as a primary indicator. 

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+

### Setup

1. **Clone & Install**
   ```bash
   git clone <repo>
   cd ai_media_processing
   npm install
   ```

2. **Start Infrastructure (Postgres & Redis)**
   ```bash
   docker-compose up -d
   ```

3. **Database Migrations**
   ```bash
   # Make sure your .env has the correct DATABASE_URL
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Run the Application**
   You need to run both the API and the Worker.
   - Terminal 1 (API): `npm run build && node dist/index.js` (Or configure a `dev:api` script)
   - Terminal 2 (Worker): `RUN_WORKER=true node dist/index.js`

## API Endpoints

### 1. Upload Media
`POST /api/v1/media/upload`
- **Body**: `multipart/form-data` with a key `image`.
- **Response**:
  ```json
  {
    "message": "Media accepted for processing.",
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```

### 2. Check Job Status
`GET /api/v1/media/:jobId`
- **Response**:
  ```json
  {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "COMPLETED",
    "result": {
      "isDuplicate": false,
      "ocrText": "MH 12 AB 1234",
      "numberPlate": "MH 12 AB 1234",
      "blurScore": 120.5,
      "brightnessScore": 140.2,
      "isScreenshot": false,
      "confidenceScores": { "plate": 0.9 }
    }
  }
  ```

## Scalability & Trade-offs
- **Decoupling**: Separating the API and Worker allows us to scale OpenCV processing horizontally without blocking HTTP ingress.
- **Queueing Backpressure**: BullMQ limits concurrent operations (`concurrency: 5`), protecting memory limits during burst uploads.
- **File Storage**: Local uploads (`/uploads`) are used for this assignment. In a production environment, this would stream directly to AWS S3, and the S3 URL would be passed to the queue.
- **pHash Matching**: Exact string matching is used for simplicity. At scale, a BK-Tree or Postgres `pg_trgm` extension should be used to find images with a Hamming distance < 5 for "near duplicate" detection.
