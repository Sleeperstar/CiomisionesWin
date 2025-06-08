
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wwtvldxvjrhbjoycaryk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dHZsZHh2anJoYmpveWNhcnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDAwMTIsImV4cCI6MjA2NDk3NjAxMn0.IpKi1dsAADA29ZdKpgQmA7BLLHGedXT20ElxtKSv2jY';

export const supabase = createClient(supabaseUrl, supabaseKey);
