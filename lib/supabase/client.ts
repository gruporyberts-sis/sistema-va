import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  'https://sfgsozzpmlzohjbiihdk.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  'sb_publishable_XMw7bz3TKImzxRNs--_hrw_YhT9DKP2'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
