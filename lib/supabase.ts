import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gituuyugvfpzxbdpmnwb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHV1eXVndmZwenhiZHBtbndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNjc3MDEsImV4cCI6MjEwMjg0MzcwMX0.Jr-_HhNSOO89r5TyaX8wPZOJCyxfH48WJWo0en9coew';

// Cross-platform safe storage adapter (prevents AsyncStorage native module null errors)
const memoryStore: Record<string, string> = {};

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {}
    return memoryStore[key] || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {}
    memoryStore[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {}
    delete memoryStore[key];
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
