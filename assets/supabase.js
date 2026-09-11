import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://moqpmrhholbbhuedvbgg.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IfSp9O5zUubH6rifFbfmZQ_DJttLC1f';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
