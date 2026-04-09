#!/usr/bin/env python3

import os
from supabase import create_client

# Get Supabase credentials from environment
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables")
    exit(1)

# Create Supabase client
supabase = create_client(supabase_url, supabase_key)

# Read SQL file
with open('/vercel/share/v0-project/scripts/001_create_submissions.sql', 'r') as f:
    sql_content = f.read()

try:
    # Execute SQL
    response = supabase.postgrest.rpc("exec_sql", {"sql": sql_content})
    print("✓ Database setup completed successfully!")
    print(response)
except Exception as e:
    print(f"Error executing SQL: {str(e)}")
    # Try alternative method using direct query
    try:
        supabase.query(sql_content)
        print("✓ Database setup completed successfully!")
    except Exception as e2:
        print(f"Error: {str(e2)}")
