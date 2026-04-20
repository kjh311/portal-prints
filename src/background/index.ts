import { supabase } from '../lib/supabaseClient';

/**
 * Portal Prints Background Service Worker
 * Handles heavy lifting: Auth checks, Cloud Storage uploads, and DB records.
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CAPTURE_FRAME') {
    handleCapture(message.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => {
        console.error('Background Error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

async function handleCapture(payload: { image: string; title: string; url: string }) {
  // 1. Check Authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    throw new Error('User not authenticated. Please log in via the extension popup.');
  }

  const user = session.user;
  const { image, title, url } = payload;

  // 2. Process Image (Base64 -> Blob)
  const blob = await dataURLtoBlob(image);
  const fileName = `${user.id}/${Date.now()}.png`;

  // 3. Upload to Supabase Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('screenshots')
    .upload(fileName, blob, {
      contentType: 'image/png',
      upsert: false
    });

  if (storageError) throw new Error(`Storage Error: ${storageError.message}`);

  // 4. Record in Database
  const { error: dbError } = await supabase
    .from('captures')
    .insert({
      user_id: user.id,
      video_url: url,
      video_title: title,
      image_path: storageData.path,
    });

  if (dbError) throw new Error(`Database Error: ${dbError.message}`);

  return { path: storageData.path };
}

/**
 * Robust Base64 to Blob conversion for Service Worker environment
 */
async function dataURLtoBlob(dataurl: string): Promise<Blob> {
  const parts = dataurl.split(',');
  const mime = parts[0].match(/:(.*?);/)![1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
