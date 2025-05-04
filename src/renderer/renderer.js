// Elements
const tabImages = document.getElementById('tab-images');
const tabVideos = document.getElementById('tab-videos');
const contentImages = document.getElementById('content-images');
const contentVideos = document.getElementById('content-videos');

// Image converter inputs
const imageInputDir = document.getElementById('image-input-dir');
const imageOutputDir = document.getElementById('image-output-dir');
const imageQuality = document.getElementById('image-quality');
const imageQualityValue = document.getElementById('image-quality-value');
const imageMaxWidth = document.getElementById('image-max-width');
const imageMaxWidthValue = document.getElementById('image-max-width-value');
const imageClearOutput = document.getElementById('image-clear-output');
const browseImageInput = document.getElementById('browse-image-input');
const browseImageOutput = document.getElementById('browse-image-output');
const startImageConversion = document.getElementById('start-image-conversion');

// Video compressor inputs
const videoInputDir = document.getElementById('video-input-dir');
const videoOutputDir = document.getElementById('video-output-dir');
const videoCrf = document.getElementById('video-crf');
const videoCrfValue = document.getElementById('video-crf-value');
const videoPreset = document.getElementById('video-preset');
const videoClearOutput = document.getElementById('video-clear-output');
const browseVideoInput = document.getElementById('browse-video-input');
const browseVideoOutput = document.getElementById('browse-video-output');
const startVideoCompression = document.getElementById('start-video-compression');

// Progress UI
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const openOutputDir = document.getElementById('open-output-dir');

// Log
const log = document.getElementById('log');
const clearLog = document.getElementById('clear-log');

// Tab switching
tabImages.addEventListener('click', () => {
  tabImages.classList.add('active');
  tabVideos.classList.remove('active');
  contentImages.classList.add('active');
  contentVideos.classList.remove('active');
});

tabVideos.addEventListener('click', () => {
  tabImages.classList.remove('active');
  tabVideos.classList.add('active');
  contentImages.classList.remove('active');
  contentVideos.classList.add('active');
});

// Sliders
imageQuality.addEventListener('input', () => {
  imageQualityValue.textContent = imageQuality.value;
});

imageMaxWidth.addEventListener('input', () => {
  imageMaxWidthValue.textContent = imageMaxWidth.value;
});

videoCrf.addEventListener('input', () => {
  videoCrfValue.textContent = videoCrf.value;
});

// Directory selection
browseImageInput.addEventListener('click', async () => {
  const dir = await window.api.selectDirectory('input');
  if (dir) {
    imageInputDir.value = dir;
    addToLog('info', `Image input directory set to: ${dir}`);
  }
});

browseImageOutput.addEventListener('click', async () => {
  const dir = await window.api.selectDirectory('output');
  if (dir) {
    imageOutputDir.value = dir;
    addToLog('info', `Image output directory set to: ${dir}`);
  }
});

browseVideoInput.addEventListener('click', async () => {
  const dir = await window.api.selectDirectory('input');
  if (dir) {
    videoInputDir.value = dir;
    addToLog('info', `Video input directory set to: ${dir}`);
  }
});

browseVideoOutput.addEventListener('click', async () => {
  const dir = await window.api.selectDirectory('output');
  if (dir) {
    videoOutputDir.value = dir;
    addToLog('info', `Video output directory set to: ${dir}`);
  }
});

// Process buttons
startImageConversion.addEventListener('click', async () => {
  // Validate input
  if (!imageInputDir.value) {
    addToLog('error', 'Please select an input directory');
    return;
  }
  
  if (!imageOutputDir.value) {
    addToLog('error', 'Please select an output directory');
    return;
  }
  
  // Disable buttons during processing
  setButtonsEnabled(false);
  
  // Show progress
  showProgress();
  
  try {
    addToLog('info', 'Starting image conversion...');
    
    // Start conversion
    const options = {
      inputDir: imageInputDir.value,
      outputDir: imageOutputDir.value,
      clearOutput: imageClearOutput.checked,
      quality: parseInt(imageQuality.value),
      maxWidth: parseInt(imageMaxWidth.value)
    };
    
    const result = await window.api.convertImages(options);
    
    // Handle completion
    updateProgress(100, 'Conversion complete!');
    addToLog('success', `Converted ${result?.convertedImages || 0} images`);
    
    if (result?.originalTotalSize && result?.finalTotalSize) {
      const savedPercent = ((result.originalTotalSize - result.finalTotalSize) / result.originalTotalSize * 100).toFixed(2);
      addToLog('success', `Size reduction: ${formatBytes(result.originalTotalSize)} → ${formatBytes(result.finalTotalSize)} (${savedPercent}% saved)`);
    }
    
    openOutputDir.style.display = 'block';
    openOutputDir.onclick = () => {
      const path = imageOutputDir.value.replace(/\\/g, '/');
      window.api.openExplorer(path);
    };
  } catch (error) {
    addToLog('error', `Error: ${error.message || error}`);
    updateProgress(0, 'Conversion failed');
  } finally {
    setButtonsEnabled(true);
  }
});

startVideoCompression.addEventListener('click', async () => {
  // Validate input
  if (!videoInputDir.value) {
    addToLog('error', 'Please select an input directory');
    return;
  }
  
  if (!videoOutputDir.value) {
    addToLog('error', 'Please select an output directory');
    return;
  }
  
  // Disable buttons during processing
  setButtonsEnabled(false);
  
  // Show progress
  showProgress();
  
  try {
    addToLog('info', 'Starting video compression...');
    
    // Start compression
    const options = {
      inputDir: videoInputDir.value,
      outputDir: videoOutputDir.value,
      clearOutput: videoClearOutput.checked,
      crf: parseInt(videoCrf.value),
      preset: videoPreset.value
    };
    
    const result = await window.api.compressVideos(options);
    
    // Handle completion
    updateProgress(100, 'Compression complete!');
    addToLog('success', `Compressed ${result?.compressedVideos || 0} videos`);
    
    if (result?.originalTotalSize && result?.finalTotalSize) {
      const savedPercent = ((result.originalTotalSize - result.finalTotalSize) / result.originalTotalSize * 100).toFixed(2);
      addToLog('success', `Size reduction: ${formatBytes(result.originalTotalSize)} → ${formatBytes(result.finalTotalSize)} (${savedPercent}% saved)`);
    }
    
    openOutputDir.style.display = 'block';
    openOutputDir.onclick = () => {
      const path = videoOutputDir.value.replace(/\\/g, '/');
      window.api.openExplorer(path);
    };
  } catch (error) {
    addToLog('error', `Error: ${error.message || error}`);
    updateProgress(0, 'Compression failed');
  } finally {
    setButtonsEnabled(true);
  }
});

// Helpers
function setButtonsEnabled(enabled) {
  startImageConversion.disabled = !enabled;
  startVideoCompression.disabled = !enabled;
  browseImageInput.disabled = !enabled;
  browseImageOutput.disabled = !enabled;
  browseVideoInput.disabled = !enabled;
  browseVideoOutput.disabled = !enabled;
  
  if (!enabled) {
    startImageConversion.classList.add('disabled');
    startVideoCompression.classList.add('disabled');
  } else {
    startImageConversion.classList.remove('disabled');
    startVideoCompression.classList.remove('disabled');
  }
}

function showProgress() {
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Processing...';
  openOutputDir.style.display = 'none';
}

function updateProgress(percent, message) {
  progressBar.style.width = `${percent}%`;
  progressText.textContent = message || 'Processing...';
}

function addToLog(type, message) {
  const line = document.createElement('p');
  line.className = type;
  line.textContent = message;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Directory selection from main process
window.api.onDirectorySelected((data) => {
  if (data.type === 'input') {
    if (tabImages.classList.contains('active')) {
      imageInputDir.value = data.path;
    } else {
      videoInputDir.value = data.path;
    }
  } else if (data.type === 'output') {
    if (tabImages.classList.contains('active')) {
      imageOutputDir.value = data.path;
    } else {
      videoOutputDir.value = data.path;
    }
  }
});

// Progress updates from main process
window.api.onProgressUpdate((data) => {
  updateProgress(data.progress, data.message);
});

// Init app
window.addEventListener('DOMContentLoaded', async () => {
  // Load settings
  try {
    const settings = await window.api.getSettings();
    
    if (settings?.lastInputDir) {
      imageInputDir.value = settings.lastInputDir;
      videoInputDir.value = settings.lastInputDir;
    }
    
    if (settings?.lastOutputDir) {
      imageOutputDir.value = settings.lastOutputDir;
      videoOutputDir.value = settings.lastOutputDir;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
});

// Clear log
clearLog.addEventListener('click', () => {
  log.innerHTML = '';
}); 