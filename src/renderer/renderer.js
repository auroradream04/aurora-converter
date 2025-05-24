// Elements
const tabImages = document.getElementById('tab-images');
const tabVideos = document.getElementById('tab-videos');
const tabHLS = document.getElementById('tab-hls');
const contentImages = document.getElementById('content-images');
const contentVideos = document.getElementById('content-videos');
const contentHLS = document.getElementById('content-hls');

// Image converter inputs
const imageInputDir = document.getElementById('image-input-dir');
const imageOutputDir = document.getElementById('image-output-dir');
const imageFormat = document.getElementById('image-format');
const imageQuality = document.getElementById('image-quality');
const imageQualityInput = document.getElementById('image-quality-input');
const imageMaxWidth = document.getElementById('image-max-width');
const imageMaxWidthInput = document.getElementById('image-max-width-input');
const imageClearOutput = document.getElementById('image-clear-output');
const browseImageInput = document.getElementById('browse-image-input');
const browseImageOutput = document.getElementById('browse-image-output');
const startImageConversion = document.getElementById('start-image-conversion');

// Video compressor inputs
const videoInputDir = document.getElementById('video-input-dir');
const videoOutputDir = document.getElementById('video-output-dir');
const videoCrf = document.getElementById('video-crf');
const videoCrfInput = document.getElementById('video-crf-input');
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

// Results UI
const resultsContainer = document.getElementById('results-container');
const resultsFilesCount = document.getElementById('results-files-count');
const resultsOriginalSize = document.getElementById('results-original-size');
const resultsFinalSize = document.getElementById('results-final-size');
const resultsSavedPercent = document.getElementById('results-saved-percent');

// Log
const log = document.getElementById('log');
const clearLog = document.getElementById('clear-log');

// New 'Open' buttons
const openImageInput = document.getElementById('open-image-input');
const openImageOutput = document.getElementById('open-image-output');
const openVideoInput = document.getElementById('open-video-input');
const openVideoOutput = document.getElementById('open-video-output');

// New HLS converter inputs
const hlsInputDir = document.getElementById('hls-input-dir');
const hlsOutputDir = document.getElementById('hls-output-dir');
const hlsSegmentDuration = document.getElementById('hls-segment-duration');
const browseHLSInput = document.getElementById('browse-hls-input');
const browseHLSOutput = document.getElementById('browse-hls-output');
const openHLSInput = document.getElementById('open-hls-input');
const openHLSOutput = document.getElementById('open-hls-output');
const startHLSConversion = document.getElementById('start-hls-conversion');

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

tabHLS.addEventListener('click', () => {
  tabImages.classList.remove('active');
  tabVideos.classList.remove('active');
  tabHLS.classList.add('active');
  contentImages.classList.remove('active');
  contentVideos.classList.remove('active');
  contentHLS.classList.add('active');
});

// Sliders
imageQuality.addEventListener('input', () => {
  imageQualityInput.value = imageQuality.value;
});

imageQualityInput.addEventListener('input', () => {
  const value = parseInt(imageQualityInput.value);
  if (!isNaN(value) && value >= 0 && value <= 100) {
    imageQuality.value = value;
  }
});

imageMaxWidth.addEventListener('input', () => {
  imageMaxWidthInput.value = imageMaxWidth.value;
});

imageMaxWidthInput.addEventListener('input', () => {
  const value = parseInt(imageMaxWidthInput.value);
  if (!isNaN(value) && value >= 100 && value <= 4000) {
    imageMaxWidth.value = value;
  }
});

videoCrf.addEventListener('input', () => {
  videoCrfInput.value = videoCrf.value;
});

videoCrfInput.addEventListener('input', () => {
  const value = parseInt(videoCrfInput.value);
  if (!isNaN(value) && value >= 0 && value <= 51) {
    videoCrf.value = value;
  }
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

browseHLSInput.addEventListener('click', async () => {
  const dir = await window.api.selectDirectory('input');
  if (dir) {
    hlsInputDir.value = dir;
    addToLog('info', `HLS input directory set to: ${dir}`);
  }
});

browseHLSOutput.addEventListener('click', async () => {
  const dir = await window.api.selectDirectory('output');
  if (dir) {
    hlsOutputDir.value = dir;
    addToLog('info', `HLS output directory set to: ${dir}`);
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
    // Always clear the output directory directly
    addToLog('info', `Clearing output directory: ${imageOutputDir.value}`);
    await window.api.clearDirectory(imageOutputDir.value);
    
    addToLog('info', 'Starting image conversion...');
    
    // Start conversion
    const options = {
      inputDir: imageInputDir.value,
      outputDir: imageOutputDir.value,
      clearOutput: false, // We've already cleared it directly
      quality: parseInt(imageQuality.value),
      maxWidth: parseInt(imageMaxWidth.value),
      convertTo: imageFormat.value
    };
    
    console.log('Image conversion options:', options);
    
    const result = await window.api.convertImages(options);
    
    // Handle completion
    updateProgress(100, 'Conversion complete!');
    
    // Update success message based on format
    if (imageFormat.value === 'webp') {
      addToLog('success', `Converted ${result?.convertedImages || 0} images to WebP`);
    } else {
      addToLog('success', `Converted ${result?.convertedImages || 0} images to PNG`);
    }
    
    if (result?.originalTotalSize && result?.finalTotalSize) {
      const savedPercent = ((result.originalTotalSize - result.finalTotalSize) / result.originalTotalSize * 100).toFixed(2);
      addToLog('success', `Size change: ${formatBytes(result.originalTotalSize)} → ${formatBytes(result.finalTotalSize)} (${savedPercent}% ${parseFloat(savedPercent) >= 0 ? 'saved' : 'increased'})`);
      
      // Update results UI
      showResults(result.convertedImages, result.originalTotalSize, result.finalTotalSize, savedPercent);
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
    // Always clear the output directory directly
    addToLog('info', `Clearing output directory: ${videoOutputDir.value}`);
    await window.api.clearDirectory(videoOutputDir.value);
    
    addToLog('info', 'Starting video compression...');
    
    // Start compression
    const options = {
      inputDir: videoInputDir.value,
      outputDir: videoOutputDir.value,
      clearOutput: false, // We've already cleared it directly
      crf: parseInt(videoCrf.value),
      preset: videoPreset.value
    };
    
    console.log('Video compression options:', options);
    
    const result = await window.api.compressVideos(options);
    
    // Handle completion
    updateProgress(100, 'Compression complete!');
    addToLog('success', `Compressed ${result?.compressedVideos || 0} videos`);
    
    if (result?.originalTotalSize && result?.finalTotalSize) {
      const savedPercent = ((result.originalTotalSize - result.finalTotalSize) / result.originalTotalSize * 100).toFixed(2);
      addToLog('success', `Size reduction: ${formatBytes(result.originalTotalSize)} → ${formatBytes(result.finalTotalSize)} (${savedPercent}% saved)`);
      
      // Update results UI
      showResults(result.compressedVideos, result.originalTotalSize, result.finalTotalSize, savedPercent);
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

startHLSConversion.addEventListener('click', async () => {
  if (!hlsInputDir.value) {
    addToLog('error', 'Please select an input directory');
    return;
  }
  if (!hlsOutputDir.value) {
    addToLog('error', 'Please select an output directory');
    return;
  }
  setButtonsEnabled(false);
  showProgress();
  try {
    addToLog('info', 'Starting HLS batch conversion...');
    const options = {
      inputDir: hlsInputDir.value,
      outputDir: hlsOutputDir.value,
      segmentDuration: parseInt(hlsSegmentDuration.value)
    };
    const result = await window.api.convertToHLS(options);
    updateProgress(100, 'HLS batch conversion complete!');
    addToLog('success', `HLS batch conversion complete: ${result?.converted || 0} files`);
    openOutputDir.style.display = 'block';
    openOutputDir.onclick = () => {
      window.api.openExplorer(hlsOutputDir.value);
    };
  } catch (error) {
    addToLog('error', `Error: ${error.message || error}`);
    updateProgress(0, 'HLS conversion failed');
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
  browseHLSInput.disabled = !enabled;
  browseHLSOutput.disabled = !enabled;
  
  if (!enabled) {
    startImageConversion.classList.add('disabled');
    startVideoCompression.classList.add('disabled');
    startHLSConversion.classList.add('disabled');
  } else {
    startImageConversion.classList.remove('disabled');
    startVideoCompression.classList.remove('disabled');
    startHLSConversion.classList.remove('disabled');
  }
}

function showProgress() {
  progressContainer.style.display = 'block';
  resultsContainer.style.display = 'none';
  progressBar.style.width = '0%';
  progressText.textContent = 'Processing...';
  openOutputDir.style.display = 'none';
}

function updateProgress(percent, message) {
  progressBar.style.width = `${percent}%`;
  progressText.textContent = message || 'Processing...';
}

function showResults(fileCount, originalSize, finalSize, savedPercent) {
  resultsContainer.style.display = 'block';
  resultsFilesCount.textContent = fileCount;
  resultsOriginalSize.textContent = formatBytes(originalSize);
  resultsFinalSize.textContent = formatBytes(finalSize);
  resultsSavedPercent.textContent = `${savedPercent}%`;
  
  // Make the percent text color reflect the amount of savings
  if (parseFloat(savedPercent) > 50) {
    resultsSavedPercent.classList.add('highlight');
  } else {
    resultsSavedPercent.classList.remove('highlight');
  }
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
  // Set default input and output directories to app's folders
  const appPath = await window.api.getAppPath();
  const defaultInputDir = `${appPath}/input`;
  const defaultOutputDir = `${appPath}/output`;
  
  // Set default directories
  imageInputDir.value = defaultInputDir;
  imageOutputDir.value = defaultOutputDir;
  videoInputDir.value = defaultInputDir;
  videoOutputDir.value = defaultOutputDir;
  hlsInputDir.value = defaultInputDir;
  hlsOutputDir.value = defaultOutputDir;
  
  addToLog('info', 'Application initialized');
  addToLog('info', `Default input directory: ${defaultInputDir}`);
  addToLog('info', `Default output directory: ${defaultOutputDir}`);
  
  // Load settings
  try {
    const settings = await window.api.getSettings();
    
    if (settings?.lastInputDir) {
      // Only override if the user has previously selected a directory
      imageInputDir.value = settings.lastInputDir;
      videoInputDir.value = settings.lastInputDir;
      hlsInputDir.value = settings.lastInputDir;
    }
    
    if (settings?.lastOutputDir) {
      // Only override if the user has previously selected a directory
      imageOutputDir.value = settings.lastOutputDir;
      videoOutputDir.value = settings.lastOutputDir;
      hlsOutputDir.value = settings.lastOutputDir;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
});

// Clear log
clearLog.addEventListener('click', () => {
  log.innerHTML = '';
});

// New 'Open' button event listeners
openImageInput.addEventListener('click', () => {
  if (imageInputDir.value) {
    window.api.openExplorer(imageInputDir.value);
  }
});
openImageOutput.addEventListener('click', () => {
  if (imageOutputDir.value) {
    window.api.openExplorer(imageOutputDir.value);
  }
});
openVideoInput.addEventListener('click', () => {
  if (videoInputDir.value) {
    window.api.openExplorer(videoInputDir.value);
  }
});
openVideoOutput.addEventListener('click', () => {
  if (videoOutputDir.value) {
    window.api.openExplorer(videoOutputDir.value);
  }
});
openHLSInput.addEventListener('click', () => {
  if (hlsInputDir.value) {
    window.api.openExplorer(hlsInputDir.value);
  }
});
openHLSOutput.addEventListener('click', () => {
  if (hlsOutputDir.value) {
    window.api.openExplorer(hlsOutputDir.value);
  }
}); 