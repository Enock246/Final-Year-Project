-- 1. Ensure email_otps exists and harden it
CREATE TABLE IF NOT EXISTS public.email_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '15 minutes')
);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Remove any public access if it exists
DROP POLICY IF EXISTS "Public can insert otps" ON public.email_otps;
DROP POLICY IF EXISTS "Public can view otps" ON public.email_otps;
DROP POLICY IF EXISTS "Service role can do all on email_otps" ON public.email_otps;

-- Only service_role can access email_otps
CREATE POLICY "Service role can do all on email_otps" ON public.email_otps
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- 2. Rate limiting table
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
    email TEXT PRIMARY KEY,
    request_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can do all on otp_rate_limits" ON public.otp_rate_limits;

CREATE POLICY "Service role can do all on otp_rate_limits" ON public.otp_rate_limits
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- 3. Rate limiting function and Garbage Collection
CREATE OR REPLACE FUNCTION check_otp_rate_limit(user_email TEXT, max_requests INT DEFAULT 3, window_minutes INT DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INT;
    win_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Garbage Collection: Delete expired OTPs as a side-effect to keep DB clean
    DELETE FROM public.email_otps WHERE expires_at < timezone('utc'::text, now());

    -- Rate Limit Checking
    SELECT request_count, window_start INTO current_count, win_start 
    FROM public.otp_rate_limits WHERE email = user_email;

    IF NOT FOUND THEN
        -- First time request
        INSERT INTO public.otp_rate_limits (email, request_count, window_start) 
        VALUES (user_email, 1, timezone('utc'::text, now()));
        RETURN TRUE;
    END IF;

    IF timezone('utc'::text, now()) < win_start + (window_minutes || ' minutes')::interval THEN
        -- Still inside the window
        IF current_count >= max_requests THEN
            RETURN FALSE; -- Rate limited
        ELSE
            UPDATE public.otp_rate_limits SET request_count = request_count + 1 WHERE email = user_email;
            RETURN TRUE;
        END IF;
    ELSE
        -- Window expired, reset
        UPDATE public.otp_rate_limits SET request_count = 1, window_start = timezone('utc'::text, now()) WHERE email = user_email;
        RETURN TRUE;
    END IF;
END;
$$;
