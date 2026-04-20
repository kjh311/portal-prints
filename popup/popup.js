async function updateDisplay() {
  const loadingState = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const captureDisplay = document.getElementById('capture-display');
  
  const previewImg = document.getElementById('preview');
  const titleEl = document.getElementById('title');
  const urlEl = document.getElementById('url');
  const timestampEl = document.getElementById('timestamp');

  try {
    const data = await chrome.storage.local.get('lastCapture');
    loadingState.classList.add('hidden');

    if (data && data.lastCapture) {
      const capture = data.lastCapture;
      
      previewImg.src = capture.image;
      titleEl.innerText = capture.title || 'Untitled Video';
      urlEl.href = capture.url;
      urlEl.innerText = capture.url;
      
      const date = new Date(capture.timestamp);
      timestampEl.innerText = `Captured on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;

      captureDisplay.classList.remove('hidden');
      emptyState.classList.add('hidden');
    } else {
      emptyState.classList.remove('hidden');
      captureDisplay.classList.add('hidden');
    }
  } catch (err) {
    console.error('Portal Prints Popup Error:', err);
    loadingState.innerText = 'Error loading capture.';
  }
}

document.addEventListener('DOMContentLoaded', updateDisplay);

// Listen for storage changes to update the popup live
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.lastCapture) {
    updateDisplay();
  }
});
