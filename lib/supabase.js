import { createClient } from "@supabase/supabase-js";

// Lazy initialize the Supabase client so it doesn't crash Next.js static builds
let supabaseInstance = null;

export const supabase = new Proxy({}, {
    get(target, prop) {
        if (!supabaseInstance) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
            supabaseInstance = createClient(url, key);
        }
        return supabaseInstance[prop];
    }
});
