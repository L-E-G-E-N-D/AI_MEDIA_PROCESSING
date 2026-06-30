// State Management
let selectedFile = null;
const jobs = new Map(); // JobId -> JobObject
let activeJobId = null;

// UI Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const previewImg = document.getElementById('preview-img');
const removePreviewBtn = document.getElementById('remove-preview-btn');
const processBtn = document.getElementById('process-btn');
const queueList = document.getElementById('queue-list');
const emptyDetails = document.getElementById('empty-details');
const detailsPanel = document.getElementById('details-panel');
const detailsContent = document.getElementById('details-content');

// Load initial jobs from LocalStorage (if any)
const init = () => {
  const savedJobs = localStorage.getItem('ai_pipeline_jobs');
  if (savedJobs) {
    try {
      const parsedJobs = JSON.parse(savedJobs);
      parsedJobs.forEach(job => {
        jobs.set(job.jobId, job);
        // If it was left processing/pending, we should poll it on startup
        if (job.status === 'PENDING' || job.status === 'PROCESSING') {
          pollJobStatus(job.jobId);
        }
      });
      renderQueue();
    } catch (e) {
      console.error('Failed to parse saved jobs', e);
    }
  }
};

const saveJobsToLocalStorage = () => {
  const jobsArray = Array.from(jobs.values());
  localStorage.setItem('ai_pipeline_jobs', JSON.stringify(jobsArray));
};

// Drag & Drop Handlers
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

removePreviewBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetUploadZone();
});

const handleFileSelect = (file) => {
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }
  selectedFile = file;
  
  // Show Preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    uploadPreview.style.display = 'flex';
    processBtn.removeAttribute('disabled');
  };
  reader.readAsDataURL(file);
};

const resetUploadZone = () => {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  uploadPreview.style.display = 'none';
  processBtn.setAttribute('disabled', 'true');
  processBtn.querySelector('span').innerText = 'Analyze Image';
};

// Clear History
document.getElementById('clear-history-btn').addEventListener('click', () => {
  jobs.clear();
  saveJobsToLocalStorage();
  renderQueue();
  showEmptyDetails();
});

// Process/Upload Image
processBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append('image', selectedFile);

  // Disable buttons during upload
  processBtn.setAttribute('disabled', 'true');
  processBtn.querySelector('span').innerText = 'Uploading...';

  try {
    const response = await fetch('/api/v1/media/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    const jobId = result.jobId;

    // Create custom local job structure
    const newJob = {
      jobId,
      filename: selectedFile.name,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      result: null
    };

    jobs.set(jobId, newJob);
    saveJobsToLocalStorage();
    renderQueue();
    selectJob(jobId);
    resetUploadZone();

    // Start live status polling
    pollJobStatus(jobId);

  } catch (error) {
    alert(`Error: ${error.message}`);
    processBtn.removeAttribute('disabled');
    processBtn.querySelector('span').innerText = 'Analyze Image';
  }
});

// Polling Job Status
const pollJobStatus = async (jobId) => {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/v1/media/${jobId}`);
      if (!response.ok) throw new Error('Failed to fetch job status');

      const jobData = await response.json();
      const currentJob = jobs.get(jobId);

      if (!currentJob) {
        clearInterval(interval);
        return;
      }

      currentJob.status = jobData.status;
      currentJob.result = jobData.result;
      
      jobs.set(jobId, currentJob);
      saveJobsToLocalStorage();
      renderQueue();

      // If this is currently active viewed job, update details panel
      if (activeJobId === jobId) {
        renderJobDetails(jobId);
      }

      // Stop polling on terminal states
      if (jobData.status === 'COMPLETED' || jobData.status === 'FAILED') {
        clearInterval(interval);
      }

    } catch (err) {
      console.error(`Error polling job ${jobId}:`, err);
      clearInterval(interval);
    }
  }, 1000);
};

// Render Job Queue List
const renderQueue = () => {
  if (jobs.size === 0) {
    queueList.innerHTML = `
      <div class="empty-state">
        <p>No jobs submitted yet. Upload an image to start processing.</p>
      </div>
    `;
    return;
  }

  // Sort by date descending
  const sortedJobs = Array.from(jobs.values()).sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  queueList.innerHTML = '';
  sortedJobs.forEach(job => {
    const isActive = activeJobId === job.jobId ? 'active' : '';
    
    // Status representation
    let statusHTML = '';
    if (job.status === 'PENDING') {
      statusHTML = `<span class="badge badge-pending">Pending</span>`;
    } else if (job.status === 'PROCESSING') {
      statusHTML = `
        <div class="spinner-sm"></div>
        <span class="badge badge-processing">Processing</span>
      `;
    } else if (job.status === 'COMPLETED') {
      statusHTML = `<span class="badge badge-completed">Completed</span>`;
    } else {
      statusHTML = `<span class="badge badge-failed">Failed</span>`;
    }

    const item = document.createElement('div');
    item.className = `queue-item ${isActive}`;
    item.innerHTML = `
      <div class="queue-item-info">
        <div class="queue-item-text">
          <div class="queue-item-name" title="${job.filename}">${job.filename}</div>
          <div class="queue-item-meta">${new Date(job.createdAt).toLocaleTimeString()}</div>
        </div>
      </div>
      <div class="queue-item-status">
        ${statusHTML}
      </div>
    `;

    item.addEventListener('click', () => selectJob(job.jobId));
    queueList.appendChild(item);
  });
};

const selectJob = (jobId) => {
  activeJobId = jobId;
  // Update selected class in DOM
  const items = queueList.querySelectorAll('.queue-item');
  const sortedJobs = Array.from(jobs.values()).sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  items.forEach((item, index) => {
    if (sortedJobs[index].jobId === jobId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  renderJobDetails(jobId);
};

const showEmptyDetails = () => {
  emptyDetails.style.display = 'flex';
  detailsContent.style.display = 'none';
  activeJobId = null;
};

// Render Job Heuristics Details
const renderJobDetails = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) {
    showEmptyDetails();
    return;
  }

  emptyDetails.style.display = 'none';
  detailsContent.style.display = 'block';

  // Basic Header Info
  document.getElementById('details-filename').innerText = job.filename;
  document.getElementById('details-job-id').innerText = `Job ID: ${job.jobId}`;
  
  const statusBadge = document.getElementById('details-status-badge');
  statusBadge.className = 'badge';
  statusBadge.innerText = job.status;
  statusBadge.classList.add(`badge-${job.status.toLowerCase()}`);

  const detailsImg = document.getElementById('details-img');

  // Handle image path mapping
  if (job.result && job.result.filePath) {
    const path = job.result.filePath;
    detailsImg.src = path.startsWith('uploads/') ? '/' + path : '/uploads/' + path;
  } else {
    // Show placeholder if image not uploaded yet or failed
    detailsImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%231a2035"/><text x="50" y="50" font-family="sans-serif" font-size="10" fill="%23555" text-anchor="middle">Loading Image...</text></svg>';
  }

  // If status is PENDING or PROCESSING, show loading status for stats
  if (job.status === 'PENDING' || job.status === 'PROCESSING') {
    document.getElementById('duplicate-alert').style.display = 'none';
    document.getElementById('screenshot-alert').style.display = 'none';
    
    document.getElementById('blur-val').innerText = '...';
    document.getElementById('blur-progress').style.width = '0%';
    document.getElementById('blur-helper').innerText = 'Queue processing...';

    document.getElementById('brightness-val').innerText = '...';
    document.getElementById('brightness-progress').style.width = '0%';
    document.getElementById('brightness-helper').innerText = 'Queue processing...';

    document.getElementById('raw-ocr-text').innerText = 'Waiting for queue...';
    document.getElementById('plate-display').innerText = '---';
    document.getElementById('plate-confidence').innerText = '0%';
    document.getElementById('phash-display').innerText = '----------------------------------------------------------------';
    return;
  }

  // Completed or Failed status details
  const result = job.result;

  if (job.status === 'FAILED') {
    document.getElementById('duplicate-alert').style.display = 'none';
    document.getElementById('screenshot-alert').style.display = 'none';
    
    document.getElementById('blur-val').innerText = 'ERROR';
    document.getElementById('blur-progress').style.width = '0%';
    document.getElementById('blur-helper').innerText = 'Processing failed';

    document.getElementById('brightness-val').innerText = 'ERROR';
    document.getElementById('brightness-progress').style.width = '0%';
    document.getElementById('brightness-helper').innerText = 'Processing failed';

    document.getElementById('raw-ocr-text').innerText = result?.errorLog || 'An error occurred during processing.';
    document.getElementById('plate-display').innerText = 'ERROR';
    document.getElementById('plate-confidence').innerText = '0%';
    document.getElementById('phash-display').innerText = 'ERROR';
    return;
  }

  // COMPLETED heuristics rendering
  if (result) {
    // 1. Duplicate Warning
    const dupAlert = document.getElementById('duplicate-alert');
    dupAlert.style.display = result.isDuplicate ? 'flex' : 'none';

    // 2. Screenshot Heuristics
    const screenshotAlert = document.getElementById('screenshot-alert');
    screenshotAlert.style.display = result.isScreenshot ? 'flex' : 'none';

    // 3. Blur Score
    const blurVal = result.blurScore || 0;
    document.getElementById('blur-val').innerText = blurVal.toFixed(2);
    // Visual progress mapping (assume 500 is very sharp)
    const blurPercent = Math.min(100, Math.max(0, (blurVal / 500) * 100));
    document.getElementById('blur-progress').style.width = `${blurPercent}%`;
    
    let blurText = '';
    if (blurVal < 50) {
      blurText = '⚠️ Highly Blurry. Very likely out of focus.';
    } else if (blurVal < 100) {
      blurText = '⚠️ Moderately Blurry. May impact OCR extraction.';
    } else {
      blurText = '🟢 Sharp and clear. Excellent edge definition.';
    }
    document.getElementById('blur-helper').innerText = blurText;

    // 4. Brightness Score
    const brightnessVal = result.brightnessScore || 0;
    document.getElementById('brightness-val').innerText = brightnessVal.toFixed(2);
    // Visual progress mapping (0-255 HSV range)
    const brightnessPercent = Math.min(100, Math.max(0, (brightnessVal / 255) * 100));
    document.getElementById('brightness-progress').style.width = `${brightnessPercent}%`;
    
    let brightnessText = '';
    if (brightnessVal < 60) {
      brightnessText = '⚠️ Too Dark. Low-light condition or bad lighting.';
    } else if (brightnessVal > 220) {
      brightnessText = '⚠️ Too Bright. Overexposed/washed out.';
    } else {
      brightnessText = '🟢 Well-lit image. Good balance.';
    }
    document.getElementById('brightness-helper').innerText = brightnessText;

    // 5. OCR & Number Plate
    document.getElementById('raw-ocr-text').innerText = result.ocrText || 'No text extracted.';
    document.getElementById('plate-display').innerText = result.numberPlate || 'NONE';
    
    const confidence = result.confidenceScores?.plate || 0;
    const confidenceValElement = document.getElementById('plate-confidence');
    confidenceValElement.innerText = `${Math.round(confidence * 100)}%`;
    if (confidence > 0.7) {
      confidenceValElement.style.color = 'var(--color-success)';
    } else if (confidence > 0.3) {
      confidenceValElement.style.color = 'var(--color-warning)';
    } else {
      confidenceValElement.style.color = 'var(--color-danger)';
    }

    // 6. pHash display
    document.getElementById('phash-display').innerText = result.phash || '----------------------------------------------------------------';
  }
};

// Initialize App
init();
