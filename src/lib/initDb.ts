import { supabase } from './supabaseClient';

export async function initDatabase() {
  try {
    console.log('[v0] Checking if submissions table exists...');
    
    // Try to check if table exists
    const { error: checkError, count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true });

    if (checkError?.code === 'PGRST116' || checkError?.message?.includes('does not exist')) {
      console.log('[v0] Table does not exist, creating...');
      // Table doesn't exist, we need to create it
      // This should be done through the Supabase dashboard or via a migration
      return { success: false, message: 'Table needs to be created in Supabase dashboard' };
    }

    console.log('[v0] Submissions table exists');
    return { success: true, message: 'Database initialized successfully' };
  } catch (error: any) {
    console.error('[v0] Database initialization error:', error);
    return { success: false, message: error.message };
  }
}
