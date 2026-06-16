CREATE TABLE public.failed_login_attempts (
    email TEXT PRIMARY KEY,
    failed_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service_role can access this directly
CREATE POLICY "Service role can do all" ON public.failed_login_attempts
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to increment failed attempts securely
CREATE OR REPLACE FUNCTION increment_failed_login(user_email TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INT;
BEGIN
    INSERT INTO public.failed_login_attempts (email, failed_count, last_attempt_at)
    VALUES (user_email, 1, timezone('utc'::text, now()))
    ON CONFLICT (email)
    DO UPDATE SET
        failed_count = public.failed_login_attempts.failed_count + 1,
        last_attempt_at = timezone('utc'::text, now())
    RETURNING failed_count INTO current_count;

    RETURN current_count;
END;
$$;

-- Function to reset failed attempts
CREATE OR REPLACE FUNCTION reset_failed_login(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.failed_login_attempts
    SET failed_count = 0,
        last_attempt_at = timezone('utc'::text, now())
    WHERE email = user_email;
END;
$$;
