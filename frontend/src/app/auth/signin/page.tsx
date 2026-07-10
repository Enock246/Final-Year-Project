'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithProtection } from '../actions';

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
});

type SigninFormValues = z.infer<typeof signinSchema>;

export default function SigninPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: SigninFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');

    if (!data.password) {
      setErrorMessage('Password is required');
      setIsSubmitting(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    if (captchaToken) {
      formData.append('captchaToken', captchaToken);
    }

    const result = await signInWithProtection(formData);

    if (result?.error === 'captcha_required') {
      setIsCaptchaRequired(true);
      setErrorMessage('Unusual activity detected. Please complete the captcha to continue.');
      setIsSubmitting(false);
    } else if (result?.error) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
    } else if (result?.success) {
      router.push(result.nextRoute || '/profile/location');
    }
  };

  const getInputClassName = (hasError: boolean, hasIconRight: boolean = false) => {
    const base = "w-full min-h-[48px] px-4 rounded-2xl border bg-canvas text-[16px] md:text-[15px] text-ink focus:outline-none transition-all duration-200";
    const paddingRight = hasIconRight ? "pr-10" : "";
    if (hasError) {
      return `${base} ${paddingRight} border-ruby focus:border-ruby focus:ring-[3px] focus:ring-ruby/10`;
    }
    return `${base} ${paddingRight} border-black/10 focus:border-primary-press focus:ring-[3px] focus:ring-primary-press/10`;
  };

  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-1.5 block";

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 bg-canvas-soft min-h-screen items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full bg-canvas p-6 md:p-8 rounded-xl shadow-none border border-hairline flex flex-col overflow-hidden"
        >
          <h1 className="heading-lg text-ink mb-1">Welcome back</h1>
          <p className="body-md text-ink-mute mb-8">Sign in to track your internship placements.</p>

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
              <label className={labelClassName}>Email</label>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-ink-secondary">Password</label>
                <Link href="/auth/forgot-password" className="text-[13px] font-medium text-primary hover:text-primary-press transition-colors">
                  Forgot password?
                </Link>
              </div>
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

            <AnimatePresence>
              {isCaptchaRequired && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-canvas-soft rounded-lg border border-hairline flex flex-col gap-3 overflow-hidden mt-4"
                >
                  <p className="text-[13px] font-medium text-ink">Security Verification</p>
                  <p className="text-[13px] text-ink-mute">Please verify you are human to continue.</p>
                  <button
                    type="button"
                    onClick={() => setCaptchaToken('dev_test_token')}
                    className={`h-10 rounded-sm text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${captchaToken ? 'bg-primary text-white' : 'bg-canvas border border-input text-ink hover:border-primary'}`}
                  >
                    {captchaToken ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verified
                      </>
                    ) : (
                      'Click to Verify (Test Mode)'
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-auto pt-6 z-10">
              <button
                type="submit"
                disabled={isSubmitting || !isValid || !watch('password') || (isCaptchaRequired && !captchaToken)}
                className="w-full bg-primary text-white text-[16px] font-medium min-h-[48px] px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <p className="text-center mt-6 text-[13px] text-ink-mute">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="font-medium text-primary hover:text-primary-press transition-colors">
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
