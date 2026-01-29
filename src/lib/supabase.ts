import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dozhlcrpfzdjfmcxejkv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvemhsY3JwZnpkamZtY3hlamt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDgzNTUsImV4cCI6MjA4NTIyNDM1NX0.x_aTH2hPlXvmZj3nlUUuZhocSUg77oFuzNY85f0ac5c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
