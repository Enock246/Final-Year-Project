import { createClient } from '@supabase/supabase-js';

// Custom fetch with retry logic to handle unstable network / ConnectTimeoutErrors
const fetchWithRetry = async (url: RequestInfo | URL, options?: RequestInit, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.warn(`Fetch failed (attempt ${i + 1}/${retries}). Retrying in 1s... Error:`, err.message);
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  throw new Error('Unreachable');
};

// WARNING: This client bypasses RLS and should ONLY be used in secure server routes.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: fetchWithRetry,
      }
    }
  );
}
