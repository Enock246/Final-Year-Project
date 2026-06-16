-- Create function to handle syncing verified users to the students table
CREATE OR REPLACE FUNCTION public.handle_user_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL) THEN
    
    INSERT INTO public.students (id, full_name, email, phone_number, student_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone_number', 'UNKNOWN_PHONE'),
      COALESCE(NEW.raw_user_meta_data->>'student_id', NEW.id::text)
    )
    ON CONFLICT (id) DO NOTHING;
    
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_verified();
