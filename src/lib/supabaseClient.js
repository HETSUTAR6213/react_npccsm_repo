import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://plhvxdyazkjjponkaxcj.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_SECRET_KEY ||
  'sb_publishable_EzroXR9eDGtMDlIU4mfLpA_R-C30Uwc';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Falling back to local, browser-only storage for now.'
  );
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
export const isSupabaseConfigured = Boolean(supabase);
export const REST_ENDPOINT =
  import.meta.env.VITE_SUPABASE_REST_ENDPOINT || 'https://plhvxdyazkjjponkaxcj.supabase.co/rest/v1/faculty_lecture_updates';
