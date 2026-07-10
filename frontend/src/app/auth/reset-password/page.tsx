'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetUserPassword } from '../actions';
import Link from 'next/link';

const resetPasswordSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!email) {
      setErrorMessage('Missing email address. Please restart the process.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('otp', data.otp);
    formData.append('newPassword', data.password);

    const result = await resetUserPassword(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
    } else if (result?.success) {
      setIsSuccess(true);
      setIsSubmitting(false);
    }
  };

  const getInputClassName = (hasError: boolean) => {
    const base = "w-full min-h-[48px] px-4 pr-10 rounded-2xl border bg-canvas text-[16px] md:text-[15px] text-ink focus:outline-none transition-all duration-200";
    if (hasError) {
      return `${base} border-ruby focus:border-ruby focus:ring-[3px] focus:ring-ruby/10`;
    }
    return `${base} border-black/10 focus:border-primary-press focus:ring-[3px] focus:ring-primary-press/10`;
  };

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-ruby" />
        </div>
        <h2 className="heading-lg text-ink mb-2">Missing Email</h2>
        <p className="body-md text-ink-mute mb-8 max-w-sm">
          We couldn't identify the account you are trying to reset. Please start over.
        </p>
        <Link href="/auth/forgot-password" className="text-[14px] font-medium text-primary hover:text-primary-press transition-colors">
          Restart password reset
        </Link>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isSuccess ? (
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          
          <h1 className="heading-lg text-ink mb-2">Create new password</h1>
          <p className="body-md text-ink-mute mb-8">
            Enter the 6-digit code sent to <strong>{email}</strong> and choose a new password.
          </p>

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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
            <div>
              <label className="text-[13px] font-medium text-ink-secondary mb-1.5 block">6-Digit Code</label>
              <div className="relative">
                <input
                  {...register('otp')}
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className={`${getInputClassName(!!errors.otp)} text-center tracking-[0.5em] font-mono font-medium`}
                />
                {errors.otp && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.otp && <p className="text-ruby text-[13px] mt-1.5">{errors.otp.message}</p>}
            </div>

            <div>
              <label className="text-[13px] font-medium text-ink-secondary mb-1.5 block">New Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={getInputClassName(!!errors.password)}
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

            <div>
              <label className="text-[13px] font-medium text-ink-secondary mb-1.5 block">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={getInputClassName(!!errors.confirmPassword)}
                />
                {errors.confirmPassword && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.confirmPassword && <p className="text-ruby text-[13px] mt-1.5">{errors.confirmPassword.message}</p>}
            </div>

            <div className="mt-auto pt-6 z-10">
              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="w-full bg-primary text-white text-[16px] font-medium min-h-[48px] px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSubmitting ? 'Resetting password...' : 'Reset password'}
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center flex-1 text-center py-8"
        >
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="heading-lg text-ink mb-2">Password Reset Successful!</h2>
          <p className="body-md text-ink-mute mb-8 max-w-sm">
            Your password has been securely updated and you are now securely logged in.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-primary text-white text-[16px] font-medium min-h-[48px] px-4 rounded-pill hover:bg-primary-press transition-colors flex items-center justify-center shadow-sm"
          >
            Continue to Dashboard
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 bg-canvas-soft min-h-screen items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full bg-canvas px-5 pb-5 pt-10 md:p-8 md:pt-12 rounded-xl shadow-none border border-hairline flex flex-col overflow-hidden relative"
        >
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center flex-1 py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </motion.div>
      </div>
    </main>
  );
}
