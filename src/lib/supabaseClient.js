import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Falling back to local, browser-only storage for now.'
  );
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
export const isSupabaseConfigured = Boolean(supabase);
export const REST_ENDPOINT =
  import.meta.env.VITE_SUPABASE_REST_ENDPOINT ||
  (supabaseUrl ? `${supabaseUrl}/rest/v1/faculty_lecture_updates` : '');
