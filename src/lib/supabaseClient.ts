import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.development.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize the submissions table on app load
export async function initializeDatabase() {
  try {
    // Check if the table exists by trying to fetch data
    const { data, error } = await supabase
      .from('submissions')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('Creating submissions table...');
      const { error: createError } = await supabase.rpc('create_submissions_table', {});
      if (createError) {
        console.error('Error creating table via RPC:', createError);
        // If RPC fails, we'll create it manually
        await createSubmissionsTableDirectly();
      }
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

async function createSubmissionsTableDirectly() {
  const sql = `
    CREATE TABLE IF NOT EXISTS submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wilaya TEXT NOT NULL,
      moughataa TEXT NOT NULL,
      name TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      education_level TEXT NOT NULL,
      last_certificate TEXT NOT NULL,
      field TEXT NOT NULL,
      years_of_service TEXT NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      q1 TEXT,
      q2 TEXT[],
      q3 TEXT[],
      q4 TEXT[],
      q5 TEXT[],
      q6 TEXT[],
      q7 TEXT[],
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow anonymous inserts" ON submissions
      FOR INSERT
      WITH CHECK (true);

    CREATE POLICY "Allow all reads" ON submissions
      FOR SELECT
      USING (true);

    CREATE POLICY "Allow all updates" ON submissions
      FOR UPDATE
      USING (true);

    CREATE POLICY "Allow all deletes" ON submissions
      FOR DELETE
      USING (true);

    CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_submissions_wilaya ON submissions(wilaya);
  `;

  // This will be handled through the v0 interface or direct SQL execution
  console.log('Table creation SQL ready:', sql);
}

// Helper functions for CRUD operations
export async function addSubmission(data: any) {
  const { data: result, error } = await supabase
    .from('submissions')
    .insert([data])
    .select();
  
  if (error) throw error;
  return result[0];
}

export async function getSubmissions() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function updateSubmission(id: string, data: any) {
  const { error } = await supabase
    .from('submissions')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteSubmission(id: string) {
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}
