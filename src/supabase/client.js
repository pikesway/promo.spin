import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'app_bizgamez_agency'
      }
    })
  : null;

export const checkSupabaseConnection = () => {
  if (!isSupabaseConfigured) {
    console.warn('Supabase credentials missing. App is running in local-only mode.');
    return false;
  }
  return true;
};