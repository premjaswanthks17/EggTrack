import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

// Lazy initialize Supabase client to avoid build-time errors with placeholder env vars
let supabaseInstance = null;

export const supabase = new Proxy({}, {
    get(target, prop) {
        if (!supabaseInstance) {
            if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
                // Return a mock if environment is not set up
                return () => ({ data: null, error: new Error("Supabase URL is not configured") });
            }
            supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
        }
        return supabaseInstance[prop];
    }
});
