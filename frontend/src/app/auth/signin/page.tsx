'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
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

  const cardClassName = "w-full max-w-md bg-canvas p-8 rounded-lg shadow-[rgba(0,55,112,0.08)_0_1px_3px] border border-hairline";
  const inputClassName = "w-full py-2 px-3 rounded-sm border border-input bg-canvas text-ink body-md focus:outline-none focus:border-primary transition-all";
  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-1.5 block";

  return (
    <main className="flex-1 flex flex-col p-6 bg-canvas-soft min-h-screen">
      <div className="w-full max-w-md mx-auto mt-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className={cardClassName}
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
              <input
                {...register('email')}
                type="email"
                placeholder="kwame.mensah@stu.aamusted.edu.gh"
                className={inputClassName}
              />
              {errors.email && <p className="text-ruby text-[13px] mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelClassName}>Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`${inputClassName} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-ink-mute hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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

            <button
              type="submit"
              disabled={isSubmitting || !isValid || !watch('password') || (isCaptchaRequired && !captchaToken)}
              className="w-full bg-primary text-white button-md py-2.5 px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 btn-primary mt-6 shadow-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
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
