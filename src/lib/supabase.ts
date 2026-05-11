import { createClient } from '@supabase/supabase-js';

// For Vite, environment variables must be prefixed with VITE_
// Fallback to NEXT_PUBLIC_ for compatibility, or use the direct values from the integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL 
  || import.meta.env.NEXT_PUBLIC_SUPABASE_URL 
  || 'https://rwmotcqxeiqddnboomlf.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 
  || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bW90Y3F4ZWlxZGRuYm9vbWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTIzOTEsImV4cCI6MjA5MTMyODM5MX0.7zNEPWj9vPC_VtykeF9IPxJPbzQXPjcNBMhWRDLlZZI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
