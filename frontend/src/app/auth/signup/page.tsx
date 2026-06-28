'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const signupSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  studentId: z.string().min(5, 'Student ID is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
  terms: z.literal(true, {
    message: 'You must agree to the Terms & Privacy Policy'
  }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification States
  const [verificationSent, setVerificationSent] = useState(false);
  const [signupData, setSignupData] = useState<SignupFormValues | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const supabase = createClient();

  const loadingSteps = [
    'Creating your account...',
    'Setting up your secure profile...',
    'Signing you in...',
  ];

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSignupData(data);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();

      if (!res.ok) {
        setErrorMessage(result.error || 'Failed to send verification code');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setVerificationSent(true);
    } catch (err) {
      console.error(err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6 || !signupData) {
      setErrorMessage('Please enter a valid 6-digit code.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email, otp: otpCode }),
      });

      const result = await res.json();

      if (!res.ok) {
        setIsVerifyingOtp(false);
        setErrorMessage(result.error || 'Invalid or expired code.');
        return;
      }

      // OTP Verified successfully! Now let's create the account natively.
      setVerificationSent(false); // Hide OTP form
      setIsSubmitting(true); // Show loading steps
      
      setLoadingStep(0);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: signupData.fullName,
            phone_number: signupData.phone,
            student_id: signupData.studentId
          },
        }
      });

      if (authError) {
        setIsSubmitting(false);
        setErrorMessage(authError.message);
        return;
      }

      await new Promise(r => setTimeout(r, 600));
      setLoadingStep(1);
      await new Promise(r => setTimeout(r, 600));
      setLoadingStep(2);
      await new Promise(r => setTimeout(r, 600));

      // Success! Redirect to profile setup
      router.push('/profile/location');
      
    } catch (err) {
      console.error(err);
      setIsVerifyingOtp(false);
      setErrorMessage('An error occurred during verification.');
    }
  };

  const getInputClassName = (hasError: boolean, hasIconRight: boolean = false) => {
    const base = "w-full min-h-[48px] px-3 rounded-sm border bg-canvas text-[16px] md:text-[15px] text-ink focus:outline-none transition-shadow duration-200";
    const paddingRight = hasIconRight ? "pr-10" : "";
    if (hasError) {
      return `${base} ${paddingRight} border-ruby focus:border-ruby focus:ring-[3px] focus:ring-ruby/20`;
    }
    return `${base} ${paddingRight} border-input focus:border-primary focus:ring-[3px] focus:ring-primary/20`;
  };

  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-1.5 block";

  if (verificationSent) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-0 md:p-6 bg-canvas md:bg-canvas-soft min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full max-w-md bg-canvas p-6 md:p-8 md:rounded-lg md:shadow-[rgba(0,55,112,0.08)_0_1px_3px] md:border md:border-hairline space-y-6 flex-1 md:flex-none flex flex-col justify-center items-center text-center"
        >
          <div className="w-12 h-12 bg-primary-subdued text-primary-deep rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h2 className="heading-lg text-ink mb-2">Verify your email</h2>
          <p className="body-md text-ink-mute mb-6">
            We've sent a 6-digit code to <span className="font-medium text-ink">{signupData?.email}</span>.
          </p>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-3 bg-red-50 border border-red-200 text-ruby rounded-md text-[13px] font-medium mb-4 text-left"
            >
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={handleVerifyOtp} className="w-full space-y-4">
            <div className="space-y-1.5 w-full">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setOtpCode(val);
                }}
                placeholder="000000"
                className="w-full h-12 px-4 text-center tracking-[1em] text-2xl font-light rounded-sm border border-input bg-canvas text-ink focus:outline-none focus:border-primary transition-all"
                style={{ fontFeatureSettings: '"tnum", "ss01"' }}
              />
            </div>

            <div className="mt-auto pt-8 md:pt-6 sticky bottom-0 left-0 right-0 bg-canvas md:relative p-4 md:p-0 border-t border-hairline md:border-t-0 z-10 -mx-6 md:mx-0">
              <button
                type="submit"
                disabled={otpCode.length !== 6 || isVerifyingOtp}
                className="w-full bg-primary text-white text-[16px] font-medium min-h-[48px] px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isVerifyingOtp ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
          
          <button 
            onClick={() => {
              setVerificationSent(false);
              setOtpCode('');
            }}
            className="text-[13px] text-ink-mute hover:text-primary mt-6 font-medium transition-colors"
          >
            Wrong email? Go back
          </button>
        </motion.div>
      </main>
    );
  }

  if (isSubmitting) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-canvas-soft min-h-screen">
        <div className="w-full bg-canvas p-6 md:p-8 md:rounded-lg md:shadow-[rgba(0,55,112,0.08)_0_1px_3px] md:border md:border-hairline max-w-md space-y-6">
          {loadingSteps.map((step, index) => (
            <AnimatePresence key={index}>
              {loadingStep >= index && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                  className="flex items-center gap-4 text-[15px] font-light text-ink"
                >
                  {loadingStep > index ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-primary"
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                    </motion.div>
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin text-ink-mute" />
                  )}
                  <span className={loadingStep > index ? 'text-ink' : 'text-ink-mute'}>
                    {step}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-0 md:p-6 bg-canvas md:bg-canvas-soft min-h-screen">
      <div className="w-full max-w-md mx-auto md:mt-8 flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full bg-canvas p-6 md:p-8 md:rounded-lg md:shadow-[rgba(0,55,112,0.08)_0_1px_3px] md:border md:border-hairline flex-1 flex flex-col"
        >
          <h1 className="heading-lg text-ink mb-1">Create your account</h1>
          <p className="body-md text-ink-mute mb-8">Join InternConnect to find your placement.</p>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-50 border border-red-200 text-ruby rounded-md text-[13px] font-medium flex items-start gap-2"
            >
              <div className="w-1.5 h-1.5 bg-ruby rounded-full mt-1.5 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelClassName}>Full Name</label>
              <div className="relative">
                <input
                  {...register('fullName')}
                  type="text"
                  placeholder="Kwame Mensah"
                  className={getInputClassName(!!errors.fullName, !!errors.fullName)}
                />
                {errors.fullName && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.fullName && <p className="text-ruby text-[13px] mt-1.5">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>School Email</label>
              <div className="relative">
                <input
                  {...register('email')}
                  type="email"
                  placeholder="kwame.mensah@stu.aamusted.edu.gh"
                  className={getInputClassName(!!errors.email, !!errors.email)}
                />
                {errors.email && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.email && <p className="text-ruby text-[13px] mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>Phone number</label>
              <div className="relative">
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="0244123456"
                  className={`${getInputClassName(!!errors.phone, !!errors.phone)} body-tabular`}
                />
                {errors.phone && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.phone && <p className="text-ruby text-[13px] mt-1.5">{errors.phone.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>Student ID</label>
              <div className="relative">
                <input
                  {...register('studentId')}
                  placeholder="IT/ED/2023/001"
                  className={`${getInputClassName(!!errors.studentId, !!errors.studentId)} body-tabular`}
                />
                {errors.studentId && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.studentId && <p className="text-ruby text-[13px] mt-1.5">{errors.studentId.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>Create Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={getInputClassName(!!errors.password, true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 ${errors.password ? 'right-10' : 'right-3'} flex items-center justify-center text-ink-mute hover:text-ink transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {errors.password && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.password && <p className="text-ruby text-[13px] mt-1.5">{errors.password.message}</p>}
            </div>

            <div className="pt-1 pb-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                  <input 
                    {...register('terms')} 
                    type="checkbox" 
                    className="peer w-[18px] h-[18px] appearance-none rounded-sm border border-input bg-canvas checked:bg-primary checked:border-primary transition-all cursor-pointer" 
                  />
                  <CheckCircle2 className="absolute w-[14px] h-[14px] text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity stroke-[3]" />
                </div>
                <span className="text-[13px] font-normal text-ink-mute transition-colors leading-snug">
                  I agree to the <Link href="/terms" className="text-primary hover:text-primary-press font-medium transition-colors">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:text-primary-press font-medium transition-colors">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms && <p className="text-ruby text-[13px] mt-1.5">{errors.terms.message}</p>}
            </div>

            <div className="mt-auto pt-8 md:pt-6 sticky bottom-0 left-0 right-0 bg-canvas md:relative p-4 md:p-0 border-t border-hairline md:border-t-0 z-10 -mx-6 md:mx-0">
              <button
                type="submit"
                disabled={!isValid}
                className="w-full bg-primary text-white text-[16px] font-medium min-h-[48px] px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                Create account
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <p className="text-center mt-6 text-[13px] text-ink-mute">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-primary hover:text-primary-press transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
