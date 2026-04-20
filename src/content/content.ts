import './content.css';

/**
 * Portal Prints Content Script
 * Handles button injection and frame capture from YouTube video element.
 */

function createSvgIcon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'white');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.padding = '8px';

  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M4 4h16v16H4V4zm2 2v12h12V6H6zm3 3h6v6H9V9z');
  path1.setAttribute('opacity', '.3');

  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M20 4v16H4V4h16m2-2H2v20h20V2zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z');

  svg.appendChild(path1);
  svg.appendChild(path2);
  return svg;
}

function injectCaptureButton() {
  const controls = document.querySelector('.ytp-right-controls');
  if (!controls) return;

  if (document.getElementById('portal-prints-btn')) return;

  const captureBtn = document.createElement('button');
  captureBtn.id = 'portal-prints-btn';
  captureBtn.className = 'ytp-button';
  captureBtn.title = 'Capture Frame (Portal Prints)';
  
  captureBtn.appendChild(createSvgIcon());
  captureBtn.onclick = captureFrame;

  controls.insertBefore(captureBtn, controls.firstChild);
}

async function captureFrame() {
  const video = document.querySelector('video.video-stream.html5-main-video') as HTMLVideoElement | null;
  if (!video) {
    showFeedback('Video element not found!', true);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    showFeedback('Could not initialize canvas context', true);
    return;
  }
  
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Clean Video Title
    const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, .ytp-title-link, h1.style-scope.ytd-watch-metadata') as HTMLElement | null;
    let videoTitle = titleEl?.innerText || document.title;
    videoTitle = videoTitle.replace(' - YouTube', '').trim();
    
    const videoUrl = window.location.href;

    showFeedback('Processing cloud upload...');

    // Ship to background script for Supabase processing
    chrome.runtime.sendMessage({
      type: 'CAPTURE_FRAME',
      payload: {
        image: dataUrl,
        title: videoTitle,
        url: videoUrl
      }
    }, (response) => {
      if (response && response.success) {
        showFeedback('Saved to Supabase Cloud!');
      } else {
        const errorMsg = response?.error || 'Cloud storage failed';
        showFeedback(`Capture failed: ${errorMsg}`, true);
      }
    });

  } catch (err: any) {
    console.error('Portal Prints Error:', err);
    if (err.name === 'SecurityError') {
      showFeedback('Access denied: YouTube restricted this frame.', true);
    } else {
      showFeedback('Capture failed: ' + (err.message || 'Error processing'), true);
    }
  }
}

function showFeedback(message: string, isError = false) {
  const existing = document.querySelector('.portal-prints-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `portal-prints-toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

injectCaptureButton();
window.addEventListener('yt-navigate-finish', injectCaptureButton);

const observer = new MutationObserver(() => injectCaptureButton());
observer.observe(document.body, { childList: true, subtree: true });
