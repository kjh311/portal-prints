import { supabase, replicateApiToken } from '../lib/supabaseClient';

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

  // 3. Upload raw image to Supabase Storage (temporary)
  const tempFileName = `${user.id}/${Date.now()}_raw.png`;
  const { error: tempError } = await supabase.storage
    .from('screenshots')
    .upload(tempFileName, blob, {
      contentType: 'image/png',
      upsert: false
    });

  if (tempError) throw new Error(`Temp Storage Error: ${tempError.message}`);

  // 4. Get public URL for the uploaded image
  const { data: tempUrlData } = supabase.storage
    .from('screenshots')
    .getPublicUrl(tempFileName);

  const imageUrl = tempUrlData.publicUrl;

  // 5. Send to Replicate's CodeFormer API
  if (!replicateApiToken) {
    throw new Error('Replicate API token not configured. Please add VITE_REPLICATE_API_TOKEN to .env');
  }

  const replicateResponse = await fetch('https://api.replicate.com/v1/sczhou/codeformer', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${replicateApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: '7c0144d6c4e76a9498f2406d711a9f80d6da5c9a3418e8617e5a96c0d5043c8e',
      input: {
        image: imageUrl,
        face_upsample: true,
        background_enhance: true,
        codeformer_fidelity: 0.5,
      },
    }),
  });

  if (!replicateResponse.ok) {
    const errorText = await replicateResponse.text();
    throw new Error(`Replicate API Error: ${replicateResponse.status} - ${errorText}`);
  }

  const replicateData = await replicateResponse.json();
  
  // Poll for completion
  let prediction = replicateData;
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Token ${replicateApiToken}`,
      },
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to check prediction status: ${statusResponse.status}`);
    }
    
    prediction = await statusResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  const enhancedImageUrl = prediction.output;

  // 6. Download enhanced image from Replicate
  const enhancedResponse = await fetch(enhancedImageUrl);
  if (!enhancedResponse.ok) {
    throw new Error(`Failed to download enhanced image: ${enhancedResponse.status}`);
  }
  const enhancedBlob = await enhancedResponse.blob();

  // 7. Upload enhanced image to Supabase Storage
  const enhancedFileName = `${user.id}/${Date.now()}.png`;
  const { data: storageData, error: storageError } = await supabase.storage
    .from('screenshots')
    .upload(enhancedFileName, enhancedBlob, {
      contentType: 'image/png',
      upsert: false
    });

  if (storageError) throw new Error(`Storage Error: ${storageError.message}`);

  // 8. Record in Database
  const { error: dbError } = await supabase
    .from('captures')
    .insert({
      user_id: user.id,
      video_url: url,
      video_title: title,
      image_path: storageData.path,
    });

  if (dbError) throw new Error(`Database Error: ${dbError.message}`);

  // 9. Delete temporary raw image
  await supabase.storage.from('screenshots').remove([tempFileName]);

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
