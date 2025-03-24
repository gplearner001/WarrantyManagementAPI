import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase project URL and public API key
const supabaseUrl = 'https://your-project-url.supabase.co'
const supabaseKey = 'your-public-api-key'

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
