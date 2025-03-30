import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rtvrwxxztmjsqfqupmkk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dnJ3eHh6dG1qc3FmcXVwbWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMDM5MzMsImV4cCI6MjA1ODg3OTkzM30.uv0BgM4rLDxry-ldTN1Nk9YZ2c_dFLAkUOtzpacu9OQ"; // Replace with the correct key

export const supabase = createClient(supabaseUrl, supabaseKey);
