import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Portal Prints: Supabase configuration missing from environment variables.');
}

/**
 * Custom storage adapter for Chrome Extensions.
 * Ensures the session is shared between Popup and Background Service Worker.
 */
const chromeStorageAdapter = {
  getItem: (key: string) => {
    return chrome.storage.local.get(key).then((result) => {
      const val = result[key];
      // Chrome storage can store objects directly. 
      // Supabase expects a string if it's the default behavior, 
      // but let's be safe and return the value as is if it's null/undefined.
      if (val === undefined || val === null) return null;
      // If it's already a string, return it. If it's an object, return it (Supabase will handle it).
      return val;
    });
  },
  setItem: (key: string, value: string) => {
    return chrome.storage.local.set({ [key]: value });
  },
  removeItem: (key: string) => {
    return chrome.storage.local.remove(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: chromeStorageAdapter as any, // Cast to any to handle the direct object return
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
