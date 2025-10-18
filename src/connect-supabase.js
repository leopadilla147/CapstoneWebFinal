import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uavahrbpauntxkngqzza.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdmFocmJwYXVudHhrbmdxenphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDYwMTYsImV4cCI6MjA3Mjk4MjAxNn0.D2RXM3_06PE2exCjZBp3zhglqX0Kv38FmP_-RsM98wk'

export const supabase = createClient(supabaseUrl, supabaseKey)