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
      router.push('/profile/location');
    }
  };

  return (
    <main className="flex-1 flex flex-col p-6 bg-zinc-50">
      <div className="w-full max-w-md mx-auto mt-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <h1 className="text-2xl font-semibold tracking-tight mb-2 text-zinc-900">Welcome back</h1>
          <p className="text-zinc-500 text-sm mb-8">Sign in to track your internship placements.</p>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="kwame.mensah@stu.aamusted.edu.gh"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-10 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
            </div>

            <AnimatePresence>
              {isCaptchaRequired && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-zinc-100 rounded-xl border border-gray-200 flex flex-col gap-3 overflow-hidden mt-4"
                >
                  <p className="text-xs font-semibold text-zinc-900">Security Verification</p>
                  <p className="text-xs text-zinc-500">Please verify you are human to continue.</p>
                  <button
                    type="button"
                    onClick={() => setCaptchaToken('dev_test_token')}
                    className={`h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${captchaToken ? 'bg-black text-white shadow-none' : 'bg-white border border-gray-200 text-zinc-700 hover:bg-zinc-50 shadow-sm'}`}
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
              className="w-full bg-black text-white h-12 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 pressable mt-6"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="font-medium text-black hover:underline">
              Create Account
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
