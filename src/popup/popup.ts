import { supabase } from '../lib/supabaseClient';

interface CaptureData {
  image_path: string;
  video_title: string;
  video_url: string;
  created_at: string;
}

// UI Elements
const loadingState = document.getElementById('loading')!;
const authSection = document.getElementById('auth-section')!;
const emptyState = document.getElementById('empty-state')!;
const captureDisplay = document.getElementById('capture-display')!;
const signOutBtn = document.getElementById('sign-out-btn')!;
const googleSignInBtn = document.getElementById('google-signin-btn') as HTMLButtonElement | null;

const previewImg = document.getElementById('preview') as HTMLImageElement | null;
const titleEl = document.getElementById('title');
const urlEl = document.getElementById('url') as HTMLAnchorElement | null;
const timestampEl = document.getElementById('timestamp');

async function init() {
  console.log('Portal Prints: Initializing popup...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) console.error('Portal Prints: Session retrieval error:', error);
    console.log('Portal Prints: Session detected:', !!session);

    if (session) {
      showApp(session.user);
    } else {
      showAuth();
    }
  } catch (err) {
    console.error('Portal Prints: Initialization failed:', err);
    showAuth();
  }
}

function showAuth() {
  loadingState.classList.add('hidden');
  captureDisplay.classList.add('hidden');
  emptyState.classList.add('hidden');
  signOutBtn.classList.add('hidden');
  authSection.classList.remove('hidden');
  resetGoogleButton();
}

function resetGoogleButton() {
  if (googleSignInBtn) {
    googleSignInBtn.disabled = false;
    googleSignInBtn.innerText = 'Sign in with Google';
    googleSignInBtn.classList.remove('loading');
  }
}

async function showApp(user: any) {
  authSection.classList.add('hidden');
  signOutBtn.classList.remove('hidden');
  loadingState.classList.remove('hidden');

  try {
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    loadingState.classList.add('hidden');

    if (error || !data) {
      emptyState.classList.remove('hidden');
      captureDisplay.classList.add('hidden');
    } else {
      const capture = data as CaptureData;
      const { data: urlData } = await supabase.storage
        .from('screenshots')
        .createSignedUrl(capture.image_path, 60);

      if (urlData && previewImg && titleEl && urlEl && timestampEl) {
        previewImg.src = urlData.signedUrl;
        titleEl.innerText = capture.video_title || 'Untitled Video';
        urlEl.href = capture.video_url;
        urlEl.innerText = capture.video_url;
        const date = new Date(capture.created_at);
        timestampEl.innerText = `Captured on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        captureDisplay.classList.remove('hidden');
        emptyState.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Portal Prints Popup Error:', err);
    loadingState.innerText = 'Error loading cloud data.';
  }
}

async function signInWithGoogle() {
  if (googleSignInBtn?.disabled) return;
  
  // Dynamically generate the redirect URL to match the current Extension ID
  const redirectUrl = chrome.identity.getRedirectURL();
  console.log('Portal Prints: Using Redirect URL:', redirectUrl);
  
  if (googleSignInBtn) {
    googleSignInBtn.disabled = true;
    googleSignInBtn.innerText = 'Connecting...';
  }

  try {
    // 1. Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      alert(`Supabase Error: ${error.message}\nEnsure ${redirectUrl} is added to Supabase Redirect URLs.`);
      resetGoogleButton();
      return;
    }
    
    if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

    // 2. Launch the Web Auth Flow
    chrome.identity.launchWebAuthFlow(
      {
        url: data.url,
        interactive: true,
      },
      async (resultUrl) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || 'Unknown Identity Error';
          alert(`Chrome Identity Error: ${errMsg}\n\nCheck if this URL is in your Supabase Redirects:\n${redirectUrl}`);
          resetGoogleButton();
          return;
        }

        if (!resultUrl) {
          resetGoogleButton();
          return;
        }

        try {
          const url = new URL(resultUrl);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const queryParams = new URLSearchParams(url.search);
          
          const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) throw sessionError;
            if (sessionData.session) {
              showApp(sessionData.session.user);
            }
          } else {
            alert('Authentication failed: No tokens returned.');
            resetGoogleButton();
          }
        } catch (parseErr: any) {
          alert(`Parser Error: ${parseErr.message}`);
          resetGoogleButton();
        }
      }
    );
  } catch (err: any) {
    console.error('Google Sign-In Error:', err);
    resetGoogleButton();
  }
}

// Event Listeners
googleSignInBtn?.addEventListener('click', signInWithGoogle);

signOutBtn?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showAuth();
});

// Initial Load
init();
